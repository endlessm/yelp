/* -*- Mode: C; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/*
 * Copyright 2017 Endless Mobile, Inc.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public
 * License along with this program; if not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Lili Cosic <lili@kinvolk.io>
 */

#include <config.h>

#include <gio/gio.h>
#include <string.h>

#include "yelp-shell-search-provider-generated.h"

#include "libyelp/yelp-document.h"
#include "libyelp/yelp-uri.h"

#define SEARCH_PROVIDER_INACTIVITY_TIMEOUT 12000 /* milliseconds */

struct _PageData
{
    gchar *title;
    gchar *title_casefold;
    gchar *desc;
    gchar *desc_casefold;
    GIcon *icon;
};

typedef struct _PageData PageData;

typedef GApplicationClass YelpSearchProviderAppClass;
typedef struct _YelpSearchProviderApp YelpSearchProviderApp;

struct _YelpSearchProviderApp {
    GApplication parent;
    gulong uri_resolve_id;
    YelpShellSearchProvider2 *skeleton;

    GHashTable *page_data_hash_map;
};

GType yelp_search_provider_app_get_type (void);

#define YELP_TYPE_SEARCH_PROVIDER_APP yelp_search_provider_app_get_type()
#define YELP_SEARCH_PROVIDER_APP(obj) \
      (G_TYPE_CHECK_INSTANCE_CAST((obj), YELP_TYPE_SEARCH_PROVIDER_APP, YelpSearchProviderApp))

G_DEFINE_TYPE (YelpSearchProviderApp, yelp_search_provider_app, G_TYPE_APPLICATION)

static PageData *
page_data_new_steal (gchar *title,
                     gchar *desc,
                     GIcon *icon)
{
    PageData *data = g_new0 (PageData, 1);
    if (title) {
        data->title = title;
        data->title_casefold = g_utf8_casefold (title, -1);
    }
    if (desc) {
        data->desc = desc;
        data->desc_casefold = g_utf8_casefold (desc, -1);
    }
    data->icon = icon;
    return data;
}

static void
page_data_free (PageData *page_data)
{
    g_free (page_data->title);
    g_free (page_data->title_casefold);
    g_free (page_data->desc);
    g_free (page_data->desc_casefold);
    g_clear_object (&page_data->icon);
    g_free (page_data);
}

static GVariant *
get_result_metas (gchar      **page_ids,
                  GHashTable  *page_data)
{
    GVariantBuilder metas;
    gint i;

    g_variant_builder_init (&metas, G_VARIANT_TYPE ("aa{sv}"));

    for (i = 0; page_ids[i] != NULL; i++) {
        GVariantBuilder meta;
        PageData *data = g_hash_table_lookup (page_data, page_ids[i]);
        g_variant_builder_init (&meta, G_VARIANT_TYPE ("a{sv}"));
        g_variant_builder_add (&meta, "{sv}",
                              "id", g_variant_new_string (page_ids[i]));
        if (data != NULL) {
            g_variant_builder_add (&meta, "{sv}",
                                   "name", g_variant_new_string (data->title));
            g_variant_builder_add (&meta, "{sv}",
                                   "icon", g_icon_serialize (data->icon));
            g_variant_builder_add (&meta, "{sv}",
                                   "description", g_variant_new_string (data->desc));
        } else {
            g_variant_builder_add (&meta, "{sv}",
                                   "name", NULL);
            g_variant_builder_add (&meta, "{sv}",
                                   "gicon", NULL);
            g_variant_builder_add (&meta, "{sv}",
                                   "description", NULL);
        }
        g_variant_builder_add_value (&metas, g_variant_builder_end (&meta));
    }

    return g_variant_new ("(aa{sv})", &metas);
}

/* FIXME: Search was copied from yelp-search-entry and slightly adapted.
 * When search in yelp gets adjusted we should export it and use it here.
 */
static gboolean
match_word (const gchar *search_phrase,
            const gchar *title_casefold,
            const gchar *desc_casefold)
{
    static GRegex *nonword = NULL;
    gint stri;
    gchar **strs;
    gboolean ret = TRUE;

    if (nonword == NULL)
        nonword = g_regex_new ("\\W", 0, 0, NULL);
    g_assert (nonword != NULL);

    strs = g_regex_split (nonword, search_phrase, 0);
    for (stri = 0; strs[stri]; stri++) {
        if (!title_casefold || !strstr (title_casefold, strs[stri])) {
            if (!desc_casefold || !strstr (desc_casefold, strs[stri])) {
                ret = FALSE;
                break;
            }
        }
    }

    g_strfreev (strs);

    return ret;
}

static GVariant *
get_search_results (gchar      **terms,
                    GHashTable  *page_data)
{
    GVariantBuilder results;
    gchar *term = g_strjoinv (" ", terms);
    GHashTableIter iter;
    const gchar *page_id;
    PageData *data;

    g_hash_table_iter_init (&iter, page_data);
    g_variant_builder_init (&results, G_VARIANT_TYPE ("as"));

    while (g_hash_table_iter_next (&iter, (gpointer *) &page_id, (gpointer *) &data)) {
        if (match_word (term, data->title_casefold, data->desc_casefold))
            g_variant_builder_add (&results, "s", page_id);
    }

    g_free (term);

    return g_variant_new ("(as)", &results);
}

typedef GVariant * (*ResultGetter) (gchar      **terms,
                                    GHashTable  *page_data);

typedef struct
{
    YelpSearchProviderApp  *app;
    GDBusMethodInvocation  *invocation;
    gchar                 **terms;
    ResultGetter            result_getter;
} DelayedResultGetter;

static gboolean
check_page_data (gpointer user_data)
{
    DelayedResultGetter* delayed = user_data;

    if (g_hash_table_size (delayed->app->page_data_hash_map) > 0) {
        g_dbus_method_invocation_return_value (delayed->invocation,
                                               delayed->result_getter (delayed->terms,
                                                                       delayed->app->page_data_hash_map));
        return G_SOURCE_REMOVE;
    }

    return G_SOURCE_CONTINUE;
}


static DelayedResultGetter *
delayed_result_getter_new (YelpSearchProviderApp  *app,
                           GDBusMethodInvocation  *invocation,
                           gchar                 **terms,
                           ResultGetter            result_getter)
{
    DelayedResultGetter *delayed = g_new0 (DelayedResultGetter, 1);

    delayed->app = g_object_ref (app);
    delayed->invocation = g_object_ref (invocation);
    delayed->terms = g_strdupv (terms);
    delayed->result_getter = result_getter;

    return delayed;
}

static void
delayed_result_getter_free (DelayedResultGetter *delayed)
{
    g_object_unref (delayed->app);
    g_object_unref (delayed->invocation);
    g_strfreev (delayed->terms);
    g_free (delayed);
}

static gboolean 
handle_get_initial_result_set (YelpShellSearchProvider2  *skeleton,
                               GDBusMethodInvocation     *invocation,
                               gchar                    **terms,
                               gpointer                   user_data)
{
    DelayedResultGetter *delayed;
    YelpSearchProviderApp *app = YELP_SEARCH_PROVIDER_APP (user_data);

    if (g_strv_length (terms) < 2 && g_utf8_strlen (terms[0], -1) < 3 ) {
        g_dbus_method_invocation_return_value (invocation, g_variant_new ("(as)", NULL));
        return TRUE;
    }

    if (g_hash_table_size (app->page_data_hash_map) > 0) {
      g_dbus_method_invocation_return_value (invocation,
                                             get_search_results (terms,
                                                                 app->page_data_hash_map));
      return TRUE;
    }

    delayed = delayed_result_getter_new (app,
                                         invocation,
                                         terms,
                                         get_search_results);
    g_idle_add_full (G_PRIORITY_DEFAULT_IDLE,
                     check_page_data,
                     delayed,
                     (GDestroyNotify) delayed_result_getter_free);
    return TRUE;
}

static gboolean
handle_get_subsearch_result_set (YelpShellSearchProvider2  *skeleton,
                                 GDBusMethodInvocation     *invocation,
                                 gchar                    **previous_results,
                                 gchar                    **terms,
                                 gpointer                   user_data)
{
    DelayedResultGetter *delayed;
    YelpSearchProviderApp *app = YELP_SEARCH_PROVIDER_APP (user_data);

    if (g_strv_length (terms) < 2 && g_utf8_strlen (terms[0], -1) < 3 ) {
        g_dbus_method_invocation_return_value (invocation, g_variant_new ("(as)", NULL));
        return TRUE;
    }

    if (g_hash_table_size (app->page_data_hash_map) > 0) {
        g_dbus_method_invocation_return_value (invocation,
                                               get_search_results (terms,
                                                                   app->page_data_hash_map));
        return TRUE;
    }

    delayed = delayed_result_getter_new (app,
                                         invocation,
                                         terms,
                                         get_search_results);
    g_idle_add_full (G_PRIORITY_DEFAULT_IDLE,
                     check_page_data,
                     delayed,
                     (GDestroyNotify) delayed_result_getter_free);
    return TRUE;
}

static gboolean
handle_get_result_metas (YelpShellSearchProvider2  *skeleton,
                         GDBusMethodInvocation     *invocation,
                         gchar                    **results,
                         gpointer                   user_data)
{

    DelayedResultGetter *delayed;
    YelpSearchProviderApp *app = YELP_SEARCH_PROVIDER_APP (user_data);

    if (g_hash_table_size (app->page_data_hash_map) > 0) {
        g_dbus_method_invocation_return_value (invocation,
                                               get_result_metas (results,
                                                                 app->page_data_hash_map));
        return TRUE;
    }

    delayed = delayed_result_getter_new (app,
                                         invocation,
                                         results,
                                         get_result_metas);
    g_idle_add_full (G_PRIORITY_DEFAULT_IDLE,
                     check_page_data,
                     delayed,
                     (GDestroyNotify) delayed_result_getter_free);
    return TRUE;
}

static void
yelp_launch (gchar                 *string_parameter,
             YelpSearchProviderApp *app,
             GDBusMethodInvocation *invocation,
             gchar                 *action)
{
    GDBusConnection *session_bus;
    GVariant *reply;
    GError *error = NULL;
    GVariantBuilder param_builder;

    session_bus = g_dbus_interface_skeleton_get_connection (G_DBUS_INTERFACE_SKELETON (app->skeleton));
    if (session_bus == NULL) {
        g_dbus_method_invocation_return_error_literal (invocation,
                                                       G_IO_ERROR,
                                                       G_IO_ERROR_FAILED,
                                                       "failed to get connection to the session bus");
        return;
    }

    g_variant_builder_init (&param_builder, G_VARIANT_TYPE ("av"));
    g_variant_builder_add (&param_builder, "v", g_variant_new_string (string_parameter));

    reply = g_dbus_connection_call_sync (session_bus,
                                         "org.gnome.Yelp",
                                         "/org/gnome/Yelp",
                                         "org.freedesktop.Application",
                                         "ActivateAction",
                                         g_variant_new ("(sava{sv})",
                                                        action,
                                                        &param_builder,
                                                        NULL),
                                         NULL,
                                         G_DBUS_CALL_FLAGS_NONE,
                                         -1,
                                         NULL,
                                         &error);

    if (reply)
        g_variant_unref (reply);
    if (error) {
        g_dbus_method_invocation_take_error (invocation, error);
        return;
    }
    g_dbus_method_invocation_return_value (invocation, NULL);
    return;
}

static gboolean 
handle_launch_search (YelpShellSearchProvider2  *skeleton,
                      GDBusMethodInvocation     *invocation,
                      gchar                    **terms,
                      guint32                    timestamp,
                      gpointer                   user_data)
{
    YelpSearchProviderApp *app = YELP_SEARCH_PROVIDER_APP (user_data);
    gchar *joined_terms = g_strjoinv (" ", terms);

    yelp_launch (joined_terms, app, invocation, "show-search");

    g_free (joined_terms);

    return TRUE;
}

static gboolean
handle_activate_result (YelpShellSearchProvider2  *skeleton,
                        GDBusMethodInvocation     *invocation,
                        gchar                     *result,
                        gchar                    **terms,
                        guint32                    timestamp,
                        gpointer                   user_data)
{
    YelpSearchProviderApp *app = YELP_SEARCH_PROVIDER_APP (user_data);

    yelp_launch (result, app, invocation, "show-page");

    return TRUE;
}

static void
search_provider_app_dispose (GObject *obj)
{
    YelpSearchProviderApp *self = YELP_SEARCH_PROVIDER_APP (obj);

    g_clear_object (&self->skeleton);
    g_clear_pointer (&self->page_data_hash_map, g_hash_table_unref);

    G_OBJECT_CLASS (yelp_search_provider_app_parent_class)->dispose (obj);
}

static void
preload_data_cb (YelpDocument          *document,
                 YelpDocumentSignal     signal,
                 YelpSearchProviderApp *self,
                 GError                *error)
{
    gchar **page_ids = yelp_document_list_page_ids (document);
    gchar **iter;

    if (signal == YELP_DOCUMENT_SIGNAL_ERROR) {
        g_warning ("error during preloading data: %s", (error != NULL) ? error->message : "unknown error");
        return;
    }

    if (signal == YELP_DOCUMENT_SIGNAL_CONTENTS)
        return;

    if (signal == YELP_DOCUMENT_SIGNAL_INFO) {
        for (iter = page_ids; *iter; iter++) {
            gchar *page_id = *iter;
            PageData *data;
            gchar *icon_string = yelp_document_get_page_icon (document, page_id);
            GIcon *icon = g_themed_icon_new (icon_string);
            g_free (icon_string);

            data = page_data_new_steal (yelp_document_get_page_title (document, page_id), 
                                        yelp_document_get_page_desc (document, page_id), 
                                        icon);
            g_hash_table_insert (self->page_data_hash_map, page_id, data);
        }

        g_application_release (G_APPLICATION (self));
        /* We only steal the contents of the page_ids array,
         * so we free only the array.
         */
        g_free (page_ids);
    }
}

static void
uri_resolved_cb (YelpUri               *uri,
                 YelpSearchProviderApp *app)
{
    YelpDocument *doc;
    gchar *page_id;

    doc = yelp_document_get_for_uri (uri);
    g_signal_handler_disconnect (uri, app->uri_resolve_id);
    app->uri_resolve_id = 0;
    page_id = yelp_uri_get_page_id (uri);
    yelp_document_request_page (doc,
                                page_id,
                                NULL,
                                (YelpDocumentCallback) preload_data_cb,
                                app,
                                NULL);

    g_object_unref (doc);
    g_free (page_id);
}

static void
search_provider_app_startup (GApplication *app)
{
    YelpSearchProviderApp *self = YELP_SEARCH_PROVIDER_APP (app);
    YelpUri *base_uri;

    G_APPLICATION_CLASS (yelp_search_provider_app_parent_class)->startup (app);

    if (g_getenv ("YELP_SEARCH_PROVIDER_PERSIST") != NULL)
        g_application_hold (app);

    base_uri = yelp_uri_new (YELP_GNOME_HELP_URI);
    self->uri_resolve_id = g_signal_connect (base_uri,
                                             "resolved",
                                             G_CALLBACK (uri_resolved_cb),
                                             self);

    self->page_data_hash_map = g_hash_table_new_full (g_str_hash,
                                                      g_str_equal,
                                                      g_free,
                                                      (GDestroyNotify) page_data_free);
    yelp_uri_resolve (base_uri);
    g_application_hold (app);
}

static gboolean
yelp_search_provider_app_dbus_register (GApplication     *app,
                                        GDBusConnection  *connection,
                                        const gchar      *object_path,
                                        GError          **error)
{
    YelpSearchProviderApp *self = YELP_SEARCH_PROVIDER_APP (app);

    if (!G_APPLICATION_CLASS (yelp_search_provider_app_parent_class)->dbus_register (app,
                                                                                     connection,
                                                                                     object_path,
                                                                                     error))
        return FALSE;

    return g_dbus_interface_skeleton_export (G_DBUS_INTERFACE_SKELETON (self->skeleton),
                                             connection,
                                             object_path,
                                             error);
}

static void
yelp_search_provider_app_dbus_unregister (GApplication    *app,
                                          GDBusConnection *connection,
                                          const gchar     *object_path)
{
    YelpSearchProviderApp *self = YELP_SEARCH_PROVIDER_APP (app);
    GDBusInterfaceSkeleton *skeleton = G_DBUS_INTERFACE_SKELETON (self->skeleton);

    if (g_dbus_interface_skeleton_has_connection (skeleton, connection))
        g_dbus_interface_skeleton_unexport_from_connection (skeleton, connection);

    G_APPLICATION_CLASS (yelp_search_provider_app_parent_class)->dbus_unregister (app,
                                                                                  connection,
                                                                                  object_path);
}

static void
yelp_search_provider_app_init (YelpSearchProviderApp *self)
{
    self->skeleton = yelp_shell_search_provider2_skeleton_new ();

    g_signal_connect (self->skeleton, "handle-get-initial-result-set",
                      G_CALLBACK (handle_get_initial_result_set), self);
    g_signal_connect (self->skeleton, "handle-get-subsearch-result-set",
                      G_CALLBACK (handle_get_subsearch_result_set), self);
    g_signal_connect (self->skeleton, "handle-get-result-metas",
                      G_CALLBACK (handle_get_result_metas), self);
    g_signal_connect (self->skeleton, "handle-activate-result",
                      G_CALLBACK (handle_activate_result), self);
    g_signal_connect (self->skeleton, "handle-launch-search",
                      G_CALLBACK (handle_launch_search), self);

    g_application_set_inactivity_timeout (G_APPLICATION (self), 
                                          SEARCH_PROVIDER_INACTIVITY_TIMEOUT);
}

static void
yelp_search_provider_app_class_init (YelpSearchProviderAppClass *klass)
{
    GApplicationClass *aclass = G_APPLICATION_CLASS (klass);
    GObjectClass *oclass = G_OBJECT_CLASS (klass);

    aclass->startup = search_provider_app_startup;
    aclass->dbus_register = yelp_search_provider_app_dbus_register;
    aclass->dbus_unregister = yelp_search_provider_app_dbus_unregister;

    oclass->dispose = search_provider_app_dispose;
}

static GApplication *
yelp_search_provider_app_new (void)
{
    return g_object_new (YELP_TYPE_SEARCH_PROVIDER_APP,
                         "application-id", "org.gnome.Yelp.SearchProvider",
                         "flags", G_APPLICATION_IS_SERVICE,
                         NULL);
}

int
main (int    argc,
      char **argv)
{
    GApplication *app;
    gint res;
    gchar *env_var = "YELP_SKIP_GUI";

    if (!g_setenv (env_var, "yes", TRUE))
        g_warning ("failed to set the env var %s", env_var);
    app = yelp_search_provider_app_new ();
    res = g_application_run (app, argc, argv);

    g_object_unref (app);

    return res;
}
