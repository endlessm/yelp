/*!
 * Scripts for eos-help-center
 */

$( document ).ready(function() {
    menu_resize();
    resize_autoheight_search();

    $('#load-container').on("click", "a", function(e) {
        if ($(this).attr('href').slice(0,7) != 'http://' &&
            $(this).attr('href').slice(0,8) != 'https://') {
            e.preventDefault();
            href = $(this).attr('href');
            $.get(href, {}, function(data, status, xhr) {
                load_content(data);
            });
        };
    });

    $('#accordion').delegate("li span", "click", function(e) {
        e.preventDefault();
        click_data = $(this);

        if ($('#second-nav .left').attr('rel') == 'hide' && $(window).width() > 800) {

            $('#second-nav .left').css('height', $('#second-nav .content_links').innerHeight());
            $('#second-nav .border').fadeOut('fast', function(){
                $('#second-nav .left').animate({
                        left: '0',
                    }, 300, function() {
                        $('#second-nav .right').css('height', 0);
                        category_click(click_data);
                        $('#second-nav .left').attr('rel','');
                });
            });
        } else {
            category_click(click_data);
        }
    });
});

$( window ).resize(function() {
    menu_resize();
    resize_autoheight();
    resize_autoheight_search();
});

function resize_autoheight() {
    if ($('#main-nav').hasClass('load_section')) {
        count = 0;
        class_count = 1;
        $('.section .body .sect').each(function(index) {
            count++;
            if ($(window).width() > 783) {
                if (count == '2') {
                    height_calculate(class_count);
                    count = 0;
                    class_count++;
                }
            } else {
                $(this).removeAttr('style');
            }
        });
        height_calculate();
    }
}

function resize_autoheight_search() {
    if ($('#wrap-article').hasClass('search-section')) {
        if ($(window).width() > 1199) {
            equalHeight($('.search-section .col-search'));
        } else {
            $('.search-section .col-search').removeAttr('style');
        }
    }
}

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
                $('#second-nav .left,#second-nav .right').css('height','');

                $('#second-nav .right .border').fadeIn('fast');
                $('#second-nav .right').height($('#second-nav .right .submenu-content').innerHeight());
                $('#second-nav').animate({
                    height: $('#second-nav .right .submenu-content').innerHeight(),
                }, 500, function() {
                    $('#second-nav, #second-nav .right').height($('#second-nav .right .submenu-content').innerHeight());
                });

            } else {
                $('#second-nav .left,#second-nav .right').css('height','');

                $('#second-nav .right .border').fadeOut('fast');
                $('#second-nav .left').animate($('#second-nav .left .content_links').innerHeight());
                $('#second-nav').animate({
                    height: $('#second-nav .left .content_links').innerHeight(),
                }, 500, function() {
                    $('#second-nav, #second-nav .left').height($('#second-nav .left .content_links').innerHeight());
                });
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
                                    .css('left','0');
                } else {
                    if(submenu != '<div id="wrap-nav"></div>'){
                        $('#second-nav').removeAttr('style')
                                        .css('left','0')
                                        .attr('rel','visible');
                    }
                }

                if ($('#second-nav .left').css('left') != '0px') {
                    $('#second-nav .right .border').fadeIn('fast');
                    $('#second-nav .right').animate({
                        height: $('#second-nav .right .submenu-content').innerHeight(),
                    });
                } else {
                    $('#second-nav .right .border').fadeOut('fast');
                    $('#second-nav .left').animate({
                        height: $('#second-nav .left .content_links').innerHeight(),
                    });
                };
            }
        }

    };
    //--------
}

function equalHeight(group) {
   tallest = 0;
   group.removeAttr('style');
   group.each(function() {
      thisHeight = $(this).innerHeight();
      if(thisHeight > tallest) {
         tallest = thisHeight;
      }
   });
   group.height(tallest);
}

function equalHeight_region(group) {
    tallest_title = 0;
    tallest_height = 0;
    group.each(function(index2) {
        thisHeight = $(this).find('.main').innerHeight();
        height_title = $(this).find('.hgroup.main_title h2.title').innerHeight();

        if(height_title > tallest_title) {
            tallest_title = height_title;
        }

        if(thisHeight > tallest_height) {
            tallest_height = thisHeight;
        }
    });

    group.each(function(index) {
        $(this).height(tallest_title + tallest_height);
    });
}

function height_calculate(class_count) {
    equalHeight($('.block_' + class_count + ' .hgroup.main_title h2.title > span'));
    equalHeight_region($('.block_' + class_count));
}

function category_click(element) {
    if (element.parent('li').hasClass('active')) {
        return false;
    };

    $('#accordion li').removeClass('active');
    $('#accordion li').removeClass('none');
    element.parent('li').addClass('active');
    element.parent('li').prev().addClass('none');

    //only for secction
    if ($('#main-nav').hasClass('load_section')) {
        title = element.text();
        rel = 'sample-content/' + element.parent('li').attr('rel') + '/html/';
        //load content
        $.get(rel + 'index.html', {}, function(data, status, xhr) {
            load_content(data);

            //configuration
            $('#content-body').scrollTo(0, 100);

            intro = $('.contents').first().attr('id', 'intro');
            intro.find('div.linkdiv').each(function( index ) {
                $(this).find('.desc').after('<i></i>');
            });

            if(!$('div.body').find('.sect-links').attr('class')) {
                $('div.body').addClass('no-sect-links');
            }

            count = 0;
            class_count = 1;
            $('.body .sect').each(function(index) {

                if (!$(this).parents('.sect').attr('class')) {
                    count++;
                    if ($(this).attr('role') != 'navigation') {
                        $(this).addClass('block_' + class_count);
                    };

                    $(this).addClass('base');
                    $(this).find('.region').each(function(index) {
                        if (index == '0') {
                            $(this).addClass('main');
                        };
                    });

                    $(this).find('.hgroup').each(function(index) {
                        if (index == '0') {
                            $(this).addClass('main_title');
                        };
                    });
                };

                if ($(window).width() > 783) {
                    if (count == '2') {
                        $(this).after('<div class="clear"></div>');
                        height_calculate(class_count);
                        count = 0;
                        class_count++;
                    }
                };
            });

        bind_clicks_events();

        });
    } else {
        if ($(window).width() < 800) {
            $('#main-nav nav').remove();
            html = element.parent('li').html();
            new_html =
            '<nav id="second-nav" class="col-xs-2 box-shadow-layout">' +
            '   <div id="wrap-nav"></div>' +
            '</nav>';
            element.parent('li').html(html + new_html);
        }

        $('#second-nav #wrap-nav').load('menu-ajax.html', function() {
            if ($(window).width() < 800) {
                $('#second-nav').animate({
                    height: $('#second-nav .left').innerHeight(),
                }, 300, function() {
                    $('#second-nav').height($('#second-nav .left').innerHeight());
                });
            } else {
                if ($('#second-nav').attr('rel') == 'visible') {
                    $('#second-nav').attr('rel','');
                } else {
                    $('#second-nav').css('left','0')
                                    .attr('rel','visible');
                }
            }
            bind_clicks_events();
        });
    }
}

function menu_back() {
    if ($(window).width() < 800) {
        $('#second-nav .left').css('height', $('#second-nav .content_links').innerHeight());
        $('#second-nav .left').animate({
                left: '0',
                height: $('#second-nav .content_links').innerHeight(),
            }, 300, function() {
                $('#second-nav .right').css('height', 0);
        });

        $('#second-nav').animate({
            height: $('#second-nav .left').innerHeight(),
        }, 300, function() {
            $('#second-nav').height($('#second-nav .left').innerHeight());
        });
    } else {
        $('#second-nav .left').css('height', $('#second-nav .content_links').innerHeight());
        $('#second-nav .border').fadeOut('fast', function(){
            $('#second-nav .left').animate({
                    left: '0',
                }, 300, function() {
                    $('#second-nav .right').css('height', 0);
            });
        });
    }
    $('#second-nav .left').attr('rel', '');
}

function load_content(data) {
    var data_string = data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/,'')
                          .replace(/src="/g, 'src="' + rel)
                          .replace(/css" href="/g, 'css" href="' + rel);
    updatedData = $(data_string);
    $.each(updatedData.find('a'), function(index, value) {
        if ($(this).attr('href').slice(0,7) != 'http://' &&
            $(this).attr('href').slice(0,8) != 'https://') {
            href_int = $(this).attr('href');
            $(this).attr('href', rel + href_int);
        };
    });
    $('#load-container').html(updatedData);
    $('#content-body').scrollTo(0,100);
    $('#content-article .footer .hgroup[role="button"]').off();
    $('#content-article .footer .hgroup[role="button"]').click(function(e) {
        $('#content-body .footer .region').slideToggle('fast', function(){
            $('#content-body').scrollTo($('.page').innerHeight(), 100);
        });
    });
}

function link_click(element) {
    $('#second-nav a').removeClass('active');
    element.addClass('active');
    href = element.attr('href');
    rel = element.attr('rel');

    $.get(rel + href, {}, function(data, status, xhr) {
        load_content(data);
        $('#content-body').scrollTo(0, 100);

    });
}

function fill_menu(click_data){
    $('#second-nav .link-container h3').removeClass('active');
    click_data.addClass('active');
    var rel = 'sample-content/' + click_data.attr('rel') + '/html/';


    $.get(rel + 'index.html', {}, function(data, status, xhr) {
        updatedData = $(data);
        group =
        '<div class="border"></div><img src="assets/img/arrow-back.png">' +
        '<div class="submenu-content">';

        title_cat_main = '<h3>' + updatedData.find('h1.title').text() + '</h3>';
        var link_main = '';

        $.each(updatedData.find('div.contents'), function(index, value) {
            if($(this).parents('.sect').attr('class') != 'sect'){
                updatedData_intro = $(this).find('a.linkdiv');
                title_link = updatedData_intro.attr('title');
                if (title_link) {
                    link_link = updatedData_intro.attr('href');
                    link_main = link_main + '<li><a href="' + link_link + '" title="' + title_link + '" rel="' + rel + '">' + title_link + '</a></li>'
                };
            }
        });

        group = group +
                title_cat_main +
                '<ul>' +
                link_main +
                '</ul>';

        $.each(updatedData.find('.sect'), function(index, value) {

            if ($(this).find('h2.title').text() != '') {
                title_cat = '<h3 class="line">' + $(this).find('h2.title').text() + '</h3>';

                var link = '';
                $.each($(this).find('a.linkdiv'), function(index, value) {
                   title_link = $(this).attr('title');
                   link_link = $(this).attr('href');
                   link = link + '<li><a href="' + link_link + '" title="' + title_link + '" rel="' + rel + '">' + title_link + '</a></li>'
                });

                group = group +
                        title_cat +
                        '<ul>' +
                        link +
                        '</ul>';
            };
        });

        group = group + '</div>';

        html_left =  $('#second-nav #wrap-nav .left').html();
        html_right = group;

        if ($(window).width() < 800) {
            $('#second-nav').html(
                '<div id="wrap-nav"><div class="left">' + html_left + '</div>' +
                '<div class="right">' + html_right + '</div></div>'
            );

            height_for_right = $('#second-nav .submenu-content').innerHeight();
            $('#second-nav .right').css('height', height_for_right);
            $('#second-nav .left').animate({
                    left: '-22em',
                }, 300, function() {
                    $('#second-nav .border').fadeOut('fast');
                    $('#second-nav .left').css('height', 0);
            });

            $('#second-nav').animate({
                height: $('#second-nav .right').innerHeight(),
            }, 300, function() {
                $('#second-nav').height($('#second-nav .right').innerHeight());
            });

        } else {
            $('#second-nav .right').html(group);

            height_for_right = $('#second-nav .submenu-content').innerHeight();
            $('#second-nav .right').css('height', height_for_right);

            $('#second-nav .left').animate({
                    left: '-16em',
                }, 300, function() {
                    $('#second-nav .border').fadeIn('fast');
                    $('#second-nav .left').css('height', 0);
            });
        }
        bind_clicks_events();
    });
}

function bind_clicks_events() {
    $('#second-nav .link-container h3').bind("click", function(e) {
        var group = '';
        e.preventDefault();
        click_data = $(this);
        fill_menu(click_data);
        $('#second-nav .left').attr('rel','hide');
        $('#second-nav .link-container h3').off();
    });

    $('#second-nav .right img').bind("click", function(e) {
        menu_back();
    });

    $('#second-nav .right .submenu-content a').bind( "click", function(e) {
        e.preventDefault();
        click_data = $(this);
        link_click(click_data);
    });
}

$('#accordion').accordion({
    heightStyle: "content"
});

$('.search').click(function(e) {
   $('.dialog-overlay').fadeIn('fast', function(){
        $('.dialog-overlay .layer-content').slideDown('fast');
   });
});

$('.dialog-overlay').click(function(e) {
    overlay = $(this);
    $('.dialog-overlay .layer-content').slideUp('fast', function(){
        overlay.fadeOut('fast');
   });
});
