endlessdir=$(datadir)/yelp/endless

scss_toplevels = \
	css/article.scss \
	css/sidebar.scss \
	$(NULL)
scss_partials = \
	css/_color.scss \
	css/_icons.scss \
	$(NULL)
css_files = $(patsubst %.scss, %.css, $(scss_toplevels))

# Rebuild the css files whenever a partial changes
$(css_files): $(scss_partials)

# scss build rule
.scss.css:
	scss $< $@

img_files = \
	img/play.png \
	img/separator.png \
	img/yelp-note-bug.png \
	img/yelp-note-important.png \
	img/yelp-note-tip.png \
	img/yelp-note-warning.png \
	img/yelp-note.png \
	$(NULL)

spec_files = \
	spec/spec.page \
	spec/mallard-logo.png \
	spec/movie.ogv \
	spec/page1.page \
	spec/page2.page \
	spec/page3.page \
	spec/raptor.jpg \
	$(NULL)

nobase_endless_DATA = $(css_files) $(img_files) $(spec_files)

EXTRA_DIST = $(scss_toplevels) $(scss_partials) $(img_files) $(spec_files)
