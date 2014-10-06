/*!
 * Scripts for eos-help-center
 */

$( document ).ready(function() {
    $('#second-nav').delegate("a", "click", function(e) {
        return false;
    });

    menu_resize();

    $('#accordion').delegate("li span", "click", function(e) {
        e.preventDefault();
        click_data = $(this);

        if ($('#second-nav .left').attr('rel') == 'hide' && $(window).width() > 800) {
            $('#second-nav .left').css('height', $('#second-nav .content_links').innerHeight());
            $('#second-nav .border').css('display', 'none');
            $('#second-nav .left').css('left', 0);
            $('#second-nav .right').css('height', 0);
            $('#second-nav .left').attr('rel','');
        } else {
            category_click(click_data);
        }
    });
});

$( window ).resize(function() {
    menu_resize();
});

function menu_resize(){
    //for main and sub menu
    if ($(window).width() < 800) {
        if (!$('#main-nav #second-nav').attr('id')) {
            submenu = $('#second-nav').clone(true);
            $('#second-nav').remove();

            if (!$('#content-nav').hasClass('small')) {
                active = $('#main-nav').find('li.active');
                active_text = active.html();
                active.html(active_text).append(submenu);
            }

            if ($('#second-nav .left').css('left') != '0px') {

                $('#second-nav .left, #second-nav .right').height(0);
                $('#second-nav .right').height($('#second-nav .right .submenu-content').innerHeight());
                $('#second-nav').height($('#second-nav .right .submenu-content').innerHeight());
                $('#second-nav, #second-nav .right').height($('#second-nav .right .submenu-content').innerHeight());

            } else {

                $('#second-nav .left, #second-nav .right').height(0);
                $('#second-nav .left').height($('#second-nav .left .content_links').innerHeight());
                $('#second-nav').height($('#second-nav .left .content_links').innerHeight());
                $('#second-nav, #second-nav .left').height($('#second-nav .left .content_links').innerHeight());

            };

            $('#content-nav, #wrap-article').addClass('small');
        }
    } else {
        if ($('#content-nav').hasClass('dynamic')) {

            if ($('#content-nav').hasClass('small') == true) {
                submenu = $('#second-nav').clone(true);
                $('#second-nav').remove();

                if (submenu == null) {
                    submenu = '<div id="wrap-nav"></div>';
                };

                $('#main-nav').after(submenu);

                $('#content-nav, #wrap-article').removeClass('small');

                if ($('#second-nav').attr('rel') == 'visible') {
                    $('#second-nav').removeAttr('style')
                                    .attr('rel','')
                                    .css('left',0);
                } else {
                    if(submenu != '<div id="wrap-nav"></div>'){
                        $('#second-nav').removeAttr('style')
                                        .css('left','0')
                                        .attr('rel','visible');
                    }
                }

                if ($('#second-nav .left').css('left') != '0px') {
                    $('#second-nav .right').height($('#second-nav .right .submenu-content').innerHeight());
                } else {
                    $('#second-nav .right').height($('#second-nav .left .content_links').innerHeight());
                };
            }
        }

    };
    //--------
}

function category_click(element) {
    if (element.parent('li').hasClass('active')) {
        return false;
    };

    $('#accordion li').removeClass('active');
    $('#accordion li').removeClass('none');
    element.parent('li').addClass('active');
    element.parent('li').prev().addClass('none');

    if ($(window).width() < 800) {
        $('#main-nav nav').remove();
        html = element.parent('li').html();
        new_html =
        '<nav id="second-nav" class="col-xs-2 box-shadow-layout">' +
        '   <div id="wrap-nav"></div>' +
        '</nav>';
        element.parent('li').html(html + new_html);
    }

    $('#second-nav #wrap-nav').load('menu-ajax-clear-left.html', function() {
        if ($(window).width() < 800) {
            $('#second-nav').height($('#second-nav .left').innerHeight());
            $('#second-nav .right').height(0);
        } else {
            if ($('#second-nav').attr('rel') == 'visible') {
                $('#second-nav').attr('rel','');
            } else {
                $('#second-nav').css('left','0')
                                .attr('rel','visible');
            }
        }
        bind_clicks_events();
        $('#second-nav .left h3.title').html('<strong>SUBMENU LEVEL 1: ' + element.html() + '</strong>');
    });
}

function menu_back() {
    if ($(window).width() < 800) {
        $('#second-nav .left').css('left', '0');
        $('#second-nav .left').height($('#second-nav .content_links').innerHeight());
        $('#second-nav .right').css('height', 0);
        $('#second-nav').height($('#second-nav .left').innerHeight());
    } else {
        $('#second-nav .left').height($('#second-nav .content_links').innerHeight());
        $('#second-nav .left').css('left', 0);
        $('#second-nav .right').height(0);
    }
    $('#second-nav .left').attr('rel', '');
}

function fill_menu(click_data){
    $('#second-nav .link-container h3').removeClass('active');
    click_data.addClass('active');

    $.get('menu-ajax-clear-right.html', {}, function(data, status, xhr) {
        updatedData = $(data);
        html_left =  $('#second-nav #wrap-nav .left').html();
        html_right = updatedData;

        if ($(window).width() < 800) {
            $('#second-nav').html(
                '<div id="wrap-nav"><div class="left">' + html_left + '</div>' +
                '<div class="right"></div></div>'
            );

            $('#second-nav .right').append(html_right);

            height_for_right = $('#second-nav .submenu-content').innerHeight();
            $('#second-nav .right').height(height_for_right);
            $('#second-nav .left').css('left', '-22em');
            $('#second-nav').height($('#second-nav .right').innerHeight());
            $('#second-nav .left').height(0);
        } else {

            $('#second-nav .right').html(updatedData);
            height_for_right = $('#second-nav .submenu-content').innerHeight();
            $('#second-nav .right').height(height_for_right);
            $('#second-nav .left').css('left', '-16em');
            $('#second-nav .left').height(0);
        }
        bind_clicks_events();
    });
}

function bind_clicks_events() {
    $('#second-nav .link-container h3').bind("click", function(e) {
        var group = '';
        $('#second-nav .right').removeAttr('style');
        e.preventDefault();
        click_data = $(this);
        fill_menu(click_data);
        $('#second-nav .left').attr('rel','hide');
        $('#second-nav .link-container h3').off();
    });

    $('#second-nav .right img').bind("click", function(e) {
        menu_back();
    });

    $('#second-nav').delegate("a", "click", function(e) {
        return false;
    });
}

$('#accordion').accordion({
    heightStyle: "content"
});
