var ft_import_running = false;
window.onbeforeunload = function() {
    if ( ft_import_running ) {
        return FT_IMPORT_DEMO.confirm_leave;
    }
};


function loading_icon(){
    var frame = $( '<iframe style="display: none;"></iframe>' );
    frame.appendTo('body');
    // Thanks http://jsfiddle.net/KSXkS/1/
    try { // simply checking may throw in ie8 under ssl or mismatched protocol
        doc = frame[0].contentDocument ? frame[0].contentDocument : frame[0].document;
    } catch(err) {
        doc = frame[0].document;
    }
    doc.open();
    doc.close();
}


// -------------------------------------------------------------------------------
var demo_contents_working_plugins = window.demo_contents_working_plugins || {};
var demo_contents_viewing_theme = window.demo_contents_viewing_theme || {};

(function ( $ ) {

    var demo_contents_params = demo_contents_params || window.demo_contents_params;

    if( typeof demo_contents_params.plugins.activate !== "object" ) {
        demo_contents_params.plugins.activate = {};
    }
    var $document = $( document );
    var is_importing = false;

    /**
     * Function that loads the Mustache template
     */
    var repeaterTemplate = _.memoize(function () {
        var compiled,
            /*
             * Underscore's default ERB-style templates are incompatible with PHP
             * when asp_tags is enabled, so WordPress uses Mustache-inspired templating syntax.
             *
             * @see track ticket #22344.
             */
            options = {
                evaluate: /<#([\s\S]+?)#>/g,
                interpolate: /\{\{\{([\s\S]+?)\}\}\}/g,
                escape: /\{\{([^\}]+?)\}\}(?!\})/g,
                variable: 'data'
            };

        return function (data, tplId ) {
            if ( typeof tplId === "undefined" ) {
                tplId = '#tmpl-demo-contents--preview';
            }
            compiled = _.template(jQuery( tplId ).html(), null, options);
            return compiled(data);
        };
    });


    String.prototype.format = function() {
        var newStr = this, i = 0;
        while (/%s/.test(newStr)) {
            newStr = newStr.replace("%s", arguments[i++]);
        }
        return newStr;
    };

    var template = repeaterTemplate();

    var ftDemoContents  = {
        plugins: {
            install: {},
            all: {},
            activate: {}
        },

        loading_step: function( $element ){
            $element.removeClass( 'demo-contents--waiting demo-contents--running' );
            $element.addClass( 'demo-contents--running' );
        },
        completed_step: function( $element, event_trigger ){
            $element.removeClass( 'demo-contents--running demo-contents--waiting' ).addClass( 'demo-contents--completed' );
            if ( typeof event_trigger !== "undefined" ) {
                $document.trigger( event_trigger );
            }
        },
        preparing_plugins: function( plugins ) {
            var that = this;
            if ( typeof plugins === "undefined" ) {
                plugins = demo_contents_params.plugins;
            }
            plugins = _.defaults( plugins,  {
                install: {},
                all: {},
                activate: {}
            } );

            demo_contents_working_plugins = plugins;
            that.plugins = demo_contents_working_plugins;

            var $list_install_plugins = $('.demo-contents-install-plugins');
            var n = _.size(that.plugins.all);
            if (n > 0) {
                var $child_steps = $list_install_plugins.find('.demo-contents--child-steps');
                $.each( that.plugins.all, function ($slug, plugin) {
                    var msg = plugin.name;

                    if( typeof that.plugins.install[ $slug] !== "undefined" ) {
                        msg = demo_contents_params.messages.plugin_not_installed.format( plugin.name );
                    } else {
                        if( typeof that.plugins.activate[ $slug] !== "undefined" ) {
                            msg = demo_contents_params.messages.plugin_not_activated.format( plugin.name );
                        }
                    }

                    var $item = $('<div data-slug="' + $slug + '" class="demo-contents-child-item dc-unknown-status demo-contents-plugin-' + $slug + '">'+msg+'</div>');
                    $child_steps.append($item);
                    $item.attr('data-plugin', $slug);
                });
            } else {
                // $list_install_plugins.hide();
            }


        },
        installPlugins: function() {
            var that = this;
            that.plugins = demo_contents_working_plugins;
            // Install Plugins
            var $list_install_plugins = $( '.demo-contents-install-plugins' );
            that.loading_step( $list_install_plugins );
            console.log( 'Being installing plugins....' );
            var $child_steps = $list_install_plugins.find(  '.demo-contents--child-steps' );
            var n = _.size( that.plugins.install );
            if ( n > 0 ) {

                var callback = function( current ){
                    if ( current.length ) {
                        var slug = current.attr( 'data-plugin' );
                        if ( typeof that.plugins.install[ slug ] === "undefined" ) {
                            var next = current.next();
                            callback( next );
                        } else {
                            var plugin =  that.plugins.install[ slug ];
                            var msg = demo_contents_params.messages.plugin_installing.format( plugin.name );
                            console.log( msg );
                            current.html( msg );

                            $.post( plugin.page_url, plugin.args, function (res) {
                                //console.log(plugin.name + ' Install Completed');
                                plugin.args.action = demo_contents_params.action_active_plugin;
                                that.plugins.activate[ slug ] = plugin;
                                var msg = demo_contents_params.messages.plugin_installed.format( plugin.name );
                                console.log( msg );
                                current.html( msg );
                                var next = current.next();
                                callback( next );
                            }).fail(function() {
                                demo_contents_working_plugins = that.plugins;
                                console.log( 'Plugins install failed' );
                                $document.trigger( 'demo_contents_plugins_install_completed' );
                            });
                        }
                    } else {
                        demo_contents_working_plugins = that.plugins;
                        console.log( 'Plugins install completed' );
                        $document.trigger( 'demo_contents_plugins_install_completed' );
                    }
                };

                var current = $child_steps.find( '.demo-contents-child-item' ).eq( 0 );
                callback( current );
            } else {
                demo_contents_working_plugins = that.plugins;
                console.log( 'Plugins install completed - 0' );
                //$list_install_plugins.hide();
                $document.trigger( 'demo_contents_plugins_install_completed' );
            }

            // that.completed_step( $list_install_plugins, 'demo_contents_plugins_install_completed' );

        },
        activePlugins: function(){
            var that = this;
            that.plugins = demo_contents_working_plugins;

            that.plugins.activate = $.extend({},that.plugins.activate );
            console.log( 'activePlugins', that.plugins );
            var $list_active_plugins = $( '.demo-contents-install-plugins' );
            that.loading_step( $list_active_plugins );
            var $child_steps = $list_active_plugins.find(  '.demo-contents--child-steps' );
            var n = _.size( that.plugins.activate );
            console.log( 'Being activate plugins....' );
            if (  n > 0 ) {
                var callback = function (current) {
                    if (current.length) {
                        var slug = current.attr('data-plugin');

                        if ( typeof that.plugins.activate[ slug ] === "undefined" ) {
                            var next = current.next();
                            callback( next );
                        } else {
                            var plugin = that.plugins.activate[slug];
                            var msg = demo_contents_params.messages.plugin_activating.format( plugin.name );
                            console.log( msg );
                            current.html( msg );
                            $.post(plugin.page_url, plugin.args, function (res) {

                                var msg = demo_contents_params.messages.plugin_activated.format( plugin.name );
                                console.log( msg );
                                current.html( msg );
                                var next = current.next();
                                callback(next);
                            }).fail(function() {
                                console.log( 'Plugins activate failed' );
                                that.completed_step( $list_active_plugins, 'demo_contents_plugins_active_completed' );
                            });
                        }

                    } else {
                        console.log(' Activated all plugins');
                        that.completed_step( $list_active_plugins, 'demo_contents_plugins_active_completed' );
                    }
                };

                var current = $child_steps.find( '.demo-contents-child-item' ).eq( 0 );
                callback( current );

            } else {
               // $list_active_plugins.hide();
                console.log(' Activated all plugins - 0');
                $list_active_plugins.removeClass('demo-contents--running demo-contents--waiting').addClass('demo-contents--completed');
                $document.trigger('demo_contents_plugins_active_completed');
            }

        },
        ajax: function( doing, complete_cb, fail_cb ){
            console.log( 'Being....', doing );
            $.ajax( {
                url: demo_contents_params.ajaxurl,
                data: {
                    action: 'demo_contents__import',
                    doing: doing,
                    current_theme: demo_contents_viewing_theme,
                    theme: '', // Import demo for theme ?
                    version: '' // Current demo version ?
                },
                type: 'GET',
                dataType: 'json',
                success: function( res ){

                    console.log( res );
                    if ( typeof complete_cb === 'function' ) {
                        complete_cb( res );
                    }
                    console.log( 'Completed: ', doing );
                    $document.trigger( 'demo_contents_'+doing+'_completed' );
                },
                fail: function( res ){
                    if ( typeof fail_cb === 'function' ) {
                        fail_cb( res );
                    }
                    console.log( 'Failed: ', doing );
                    $document.trigger( 'demo_contents_'+doing+'_failed' );
                    $document.trigger( 'demo_contents_ajax_failed', [ doing ] );
                }

            } )
        },
        import_users: function(){
            var step =  $( '.demo-contents-import-users' );
            var that = this;
            that.loading_step( step );
            this.ajax( 'import_users', function(){
                that.completed_step( step );
            } );
        },
        import_categories: function(){
            var step =  $( '.demo-contents-import-categories' );
            var that = this;
            that.loading_step( step );
            this.ajax(  'import_categories', function(){
                that.completed_step( step );
            } );
        },
        import_tags: function(){
            var step =  $( '.demo-contents-import-tags' );
            var that = this;
            that.loading_step( step );
            this.ajax(  'import_tags', function(){
                that.completed_step( step );
            } );
        },
        import_taxs: function(){
            var step =  $( '.demo-contents-import-taxs' );
            var that = this;
            that.loading_step( step );
            this.ajax(  'import_taxs', function(){
                that.completed_step( step );
            } );
        },
        import_posts: function(){
            var step =  $( '.demo-contents-import-posts' );
            var that = this;
            that.loading_step( step );
            this.ajax( 'import_posts', function(){
                that.completed_step( step );
            } );
        },

        import_theme_options: function(){
            var step =  $( '.demo-contents-import-theme-options' );
            var that = this;
            that.loading_step( step );
            this.ajax( 'import_theme_options', function(){
                that.completed_step( step );
            } );
        },

        import_widgets: function(){
            var step =  $( '.demo-contents-import-widgets' );
            var that = this;
            that.loading_step( step );
            this.ajax( 'import_widgets', function(){
                that.completed_step( step );
            } );
        },

        import_customize: function(){
            var step =  $( '.demo-contents-import-customize' );
            var that = this;
            that.loading_step( step );
            this.ajax( 'import_customize', function (){
                that.completed_step( step );
            } );
        },

        toggle_collapse: function(){
            $document .on( 'click', '.demo-contents-collapse-sidebar', function( e ){
                $( '#demo-contents--preview' ).toggleClass('ft-preview-collapse');
            } );
        },

        done: function(){
            console.log( 'All done' );
            $( '.demo-contents--import-now' ).replaceWith( '<a href="'+demo_contents_params.home+'" class="button button-primary">'+demo_contents_params.btn_done_label+'</a>' );
        },

        failed: function(){
            console.log( 'Import failed' );
            $( '.demo-contents--import-now' ).replaceWith( '<span class="button button-secondary">'+demo_contents_params.failed_msg+'</span>' );
        },

        render_tasks: function(){

        },

        preview: function(){
            var that = this;
            $document .on( 'click', '.demo-contents--preview-theme-btn', function( e ){
                e.preventDefault();
                var btn              = $( this );
                var theme           = btn.closest('.theme');
                var demoURL         = btn.attr( 'data-demo-url' ) || '';
                var slug            = btn.attr( 'data-theme-slug' ) || '';
                var name            = btn.attr( 'data-name' ) || '';
                var demo_version    = btn.attr( 'data-demo-version' ) || '';
                var demo_name       = btn.attr( 'data-demo-version-name' ) || '';
                var img             = $( '.theme-screenshot', theme ).html();
                if ( demoURL.indexOf( 'http' ) !== 0 ) {
                    demoURL = 'https://demos.famethemes.com/'+slug+'/';
                }
                $( '#demo-contents--preview' ).remove();

                demo_contents_viewing_theme =  {
                    name: name,
                    slug: slug,
                    demo_version: demo_version,
                    demo_name:  demo_name,
                    demoURL: demoURL,
                    img: img,
                    activate: false
                };

                if ( demo_contents_params.current_theme == slug  ||  demo_contents_params.current_child_theme ==  slug ) {
                    demo_contents_viewing_theme.activate = true;
                }

                var previewHtml = template( demo_contents_viewing_theme );
                $( 'body' ).append( previewHtml );
                $( 'body' ).addClass( 'demo-contents-body-viewing' );

                if ( demo_contents_viewing_theme.activate) {
                    $( '.demo-contents--activate-notice' ).hide();
                    that.preparing_plugins();
                } else {
                    $( '.demo-contents-import-progress' ).hide();
                    $( '.demo-contents--activate-notice' ).show();

                    var activate_theme_btn =  $( '<a href="#" class="demo-contents--activate-now button button-primary">'+demo_contents_params.activate_theme+'</a>' );
                    $( '.demo-contents--import-now' ).replaceWith( activate_theme_btn );
                }

                $document.trigger( 'demo_contents_preview_opened' );

            } );

            $document.on( 'click', '.demo-contents-close', function( e ) {
                e.preventDefault();
                $( this ).closest('#demo-contents--preview').remove();
                $( 'body' ).removeClass( 'demo-contents-body-viewing' );
            } );

        },

        init: function(){
            var that = this;

            that.preview();
            that.toggle_collapse();

            $document.on( 'demo_contents_ready', function(){
                that.installPlugins();
            } );

            $document.on( 'demo_contents_plugins_install_completed', function(){
                that.activePlugins();
            } );

            $document.on( 'demo_contents_plugins_active_completed', function(){
                that.import_users();
            } );

            $document.on( 'demo_contents_import_users_completed', function(){
                that.import_categories();
            } );

            $document.on( 'demo_contents_import_categories_completed', function(){
                that.import_tags();
            } );

            $document.on( 'demo_contents_import_tags_completed', function(){
                that.import_taxs();
            } );

            $document.on( 'demo_contents_import_taxs_completed', function(){
                that.import_posts();
            } );

            $document.on( 'demo_contents_import_posts_completed', function(){
                that.import_theme_options();
            } );

            $document.on( 'demo_contents_import_theme_options_completed', function(){
                that.import_widgets();
            } );

            $document.on( 'demo_contents_import_widgets_completed', function(){
                that.import_customize();
            } );

            $document.on( 'demo_contents_import_customize_completed', function(){
                that.done();
            } );

            $document.on( 'demo_contents_ajax_failed', function(){
                that.failed();
            } );

            if ( demo_contents_params.run == 'run' ) {
                $document.trigger( 'demo_contents_ready' );
            }

            // Toggle Heading
            $document.on( 'click', '.demo-contents--step', function( e ){
                e.preventDefault();
                $( '.demo-contents--child-steps', $( this ) ).toggleClass( 'demo-contents--show' );
            } );

            // Import now click
            $document.on( 'click', '.demo-contents--import-now', function( e ) {
                e.preventDefault();
                if ( ! $( this ).hasClass( 'updating-message' ) ) {
                    $( this ).addClass( 'updating-message' );
                    $document.trigger( 'demo_contents_ready' );
                }

            } );

            // Activate Theme Click
            $document.on( 'click', '.demo-contents--activate-now', function( e ) {
                e.preventDefault();
                var btn =  $( this );
                if ( ! btn.hasClass( 'updating-message' ) ) {
                    btn.addClass( 'updating-message' );
                    that.ajax( 'activate_theme', function( res ){
                        var new_btn = $( '<a href="#" class="updating-message button button-primary">' + demo_contents_params.checking_theme + '</a>' );
                        btn.replaceWith( new_btn );
                        $.get( demo_contents_params.theme_url, { __checking_plugins: 1 }, function( res ){
                            console.log( 'Checking plugin completed' );
                            new_btn.replaceWith('<a href="#" class="demo-contents--import-now button button-primary">' + demo_contents_params.import_now + '</a>');
                            if ( res.success ) {
                                demo_contents_viewing_theme.activate = true;
                                that.preparing_plugins( res.data );
                                $( '.demo-contents--activate-notice' ).hide( 200 );
                                $( '.demo-contents-import-progress' ).show(200);
                                /// Activate success! Now Import content

                            }
                        } );


                    } );
                }
            } );

            $document.on( 'demo_contents_preview_opened', function(){
               // $document.trigger( 'demo_contents_import_posts_completed' );
            } );

            //$( '.demo-contents--preview-theme-btn' ).eq( 0 ).click();


        }
    };

    $.fn.ftDemoContent = function() {
        ftDemoContents.init();
    };




}( jQuery ));

jQuery( document ).ready( function( $ ){

    $( document ).ftDemoContent();
    // Active Plugins








});



