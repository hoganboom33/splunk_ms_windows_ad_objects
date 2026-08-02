(function() {
	require([
		'underscore',
		'backbone',
		'splunkjs/mvc',
		'../app/ms_windows_ad_objects/components/ms_ad_obj_modal/ms_ad_obj_modal_popup',
		'splunkjs/mvc/simplexml/ready!'
	], function(_, Backbone, mvc, ms_ad_obj_modal_preview) {
    	$(document).ready(function () {
            function setToken(name, value) {
                var defaultTokenModel = mvc.Components.get('default');
                if (defaultTokenModel) {
                    defaultTokenModel.set(name, value);
                }
                var submittedTokenModel = mvc.Components.get('submitted');
                if (submittedTokenModel) {
                    submittedTokenModel.set(name, value);
                }
            }
            var defaultTokenModel = mvc.Components.get("default");
            var submittedTokenModel = mvc.Components.get("submitted");  
            defaultTokenModel.on("change:set_dyn_object_embed_val", function(e) {
                //Hide the html content whenever a new one is selected //
                $("#content_obj").hide();
                $("#content_obj_title").hide();	
                $("#dyn_pan_content_obj").hide();
                //Get the updated tokens for the object content
                var object_set_val = defaultTokenModel.get("set_dyn_object_embed_val");
                var object_show_flag = defaultTokenModel.get("tok_show_object_flag");
                //If token (tok_show_object_flag) is True then add the html object to the #content_obj html id Otherwise show default if used
                if(object_show_flag==="True") {
                    setToken("tok_object_src", object_set_val)
                    var addDObjView = '<object id="dyn_pan_content_obj" width="95%" height="640px" data="' + object_set_val + '" border="1" frameborder="2" style="display: inline;overflow:scroll;min-height:600px;"></object>'+
                    '<h4 style="text-align:center;"><b><i><a href="' + object_set_val + '" target="_blank"><i class="icon-external" style="padding-left:5px;"/>Click Here</a> to open video or document in a seperate browser window.</i></b></h4>'
                    $("#content_obj").html(addDObjView)
                    $("#main_content_obj").show();
                    $("#content_obj").show();
                    $("#content_obj_title").show();
                    $("#dyn_pan_content_obj").show();
                } else {
                    setToken("tok_show_object_flag", undefined);
                    setToken("tok_show_obj_default", "True");
                };
            });        
            $('.dashboard-body').on("click", '[data-t-mod-id]', function (ms_ad_obj_modal_pop) {
                var target = $(ms_ad_obj_modal_pop.currentTarget);
                t_modal = target.data('t-mod-id');
                var t_m_obj=document.getElementById(t_modal);
                var t_obj_i_html=t_m_obj.innerHTML
                var prev_ms_ad_obj_modal = new ms_ad_obj_modal_preview({ t_title: t_modal,t_inner_p_html: t_obj_i_html});
                prev_ms_ad_obj_modal.show();
            });
            var defaultTokenModel = mvc.Components.get("default");
            var submittedTokenModel = mvc.Components.get("submitted");         
            var items_icon_array = defaultTokenModel.get("tok_dash_mod_icons"); 
            if(items_icon_array) {
                var items_icon_array_set = items_icon_array.split(",");
                for(var i = 0; i <= items_icon_array_set.length; i++) {
                    var item_src = items_icon_array_set[i]
                    
                    if(item_src !== undefined,item_src){
                        console.log("item_src",item_src)
                        var item_src_array = item_src.split(":")
                        var mod_trigger_m_id = item_src_array[0];
                        var mod_trigger_h_id = '#'+mod_trigger_m_id
                        var mod_trigger_icon = item_src_array[1];
                        var mod_link_label = '#'+mod_trigger_h_id + ' label:first-child'
                        var w_mod_input_trigger = '<i class="icon-'+mod_trigger_icon+' ms-obj-mod-icon" data-t-mod-id="'+mod_trigger_m_id+'_pop"/>'
                        $(mod_trigger_h_id).find("label:first-child").prepend(w_mod_input_trigger)
                    }
                } 
            }


            $('.dashboard-body').on("click", '[data-ms-ad-obj-obj-type],[data-ms-ad-obj-obj-used],[data-ms-ad-obj-obj-title],[data-ms-ad-obj-obj-src],[data-ms-ad-obj-obj-refresh]', function (ms_ad_obj_obj_set) {
                var target = $(ms_ad_obj_obj_set.currentTarget);
                var object_used = target.data('ms-ad-obj-obj-used');
                var object_type = target.data('ms-ad-obj-obj-type');
                var object_h_id = "#content_"+object_type
                var object_h_dyn_id = "#content_dyn_"+object_type
                var object_title = target.data('ms-ad-obj-obj-title');
                var object_src = target.data('ms-ad-obj-obj-src');
                var object_refresh = target.data('ms-ad-obj-obj-refresh');
                $("#content_f_object").hide(); 
                $("#content_dyn_f_object").hide();
                $("#content_dyn_f_title").hide();
                $("#content_vid_object").hide(); 
                $("#content_view_object").hide();
                $("#content_srch_object").hide();
                $("#content_dash_object").hide(); 
                $("#content_rpt_object").hide();
                $(object_h_id).show()
                $(object_h_dyn_id).attr("src",object_src);
                $(object_h_dyn_id).show()
                var object_w_title='<h1 id="content_dyn_f_title" style="text-align:center;font-family:proxima_nova;padding:5px 10px 5px 10px;box-sizing: border-box !important;box-shadow: 1px 1px 7px -1px rgb(198,211,222,1) !important;box-sizing: border-box;display: block;margin: 5px 10px 5px 10px;"><b><i>'+object_title+'</i></b></h1>'
                if(object_used==="True") {
                        $("#pan_right_f").show();
                        $("#h_r_f_object").show();
                        if(object_title==="none"){
                            $("#content_dyn_f_title").hide();
                        } else {
                            $("#content_dyn_f_title").show();
                         }
                        $("#pan_right_p_o").hide();
                } else {
                    //Hide the html content whenever a new one is selected //
                    if(object_type==="Hide_Object_Show_Page"){
                        $("#pan_right_p_o").show();
                        $("#h_r_n_page").show();
                        $("#h_r_n_page .panel-body.html").show();
                        $("#pan_right_f").hide();
                        $("#h_r_f_object").hide();
                    } else {
                        $("#pan_right_p_o").hide();
                        $("#h_r_n_page").hide();
                        $("#h_r_n_page .panel-body.html").hide();
                        $("#pan_right_f").hide();
                        $("#h_r_f_object").hide();                  
                    }
                };            
            });       
            $('.dashboard-body').on('click', '[data-set-token],[data-unset-token],[data-token-json]', function(e) {
                e.preventDefault();
                var target = $(e.currentTarget);
                var setTokenName = target.data('set-token');
                if (setTokenName) {
                    setToken(setTokenName, target.data('value'));
                }
                var unsetTokenName = target.data('unset-token');
                if (unsetTokenName) {
                    setToken(unsetTokenName, undefined);
                }
                var tokenJson = target.data('token-json');
                if (tokenJson) {
                    try {
                        if (_.isObject(tokenJson)) {
                            _(tokenJson).each(function(value, key) {
                                if (value == null ) {
                                    // Unset the token
                                    setToken(key, undefined);
                                } else if (value =='undefined') {
                                    setToken(key, undefined);
                                } else {
                                    setToken(key, value);
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('Cannot parse token JSON: ', e);
                    }
                }
            });          
		});			  
	});
}).call(this);