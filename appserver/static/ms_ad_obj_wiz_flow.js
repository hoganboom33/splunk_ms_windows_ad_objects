require([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/postprocessmanager',
    '../app/ms_windows_ad_objects/components/ms_ad_obj_modal/ms_ad_obj_modal_popup',
    'splunkjs/mvc/simplexml/ready!'
], function(_, $, mvc, TableView, SearchManager,PostProcessManager,ms_ad_obj_modal_preview) {
    $(document).ready(function () {
        const exec_flg="0";
        var defaultTokenModel = mvc.Components.get('default');
        var submittedTokenModel = mvc.Components.get('submitted');
        //Set Tokens Values
        function setToken(name, value, submit) {
            if (defaultTokenModel && typeof name !== 'undefined') {
                if(value=="undefined"){
                    defaultTokenModel.unset(name)
                } else {
                    defaultTokenModel.set(name, value);
                }
            }
            if (!!submit) {
              submitTokens();
            }
          }
        // Copy defaultTokems values into submittedTokens
        function submitTokens() {
            if (submittedTokenModel && defaultTokenModel) {
               submittedTokenModel.set(defaultTokenModel.toJSON());
            }
        }
        var base_tut_srch = splunkjs.mvc.Components.get("base_tut_nav");
        var src_part_details = splunkjs.mvc.Components.get("base_tut_nav_details");
        var src_part_states = splunkjs.mvc.Components.get("sub_part_state_details");
        var src_step_states = splunkjs.mvc.Components.get("sub_step_state_details");
        src_part_details.on('search:done', function(properties) {  
            $("#row_single").hide()
            $("#row_sub").hide()
            var def_part_details_results = src_part_details.data("results");
            def_part_details_results.on("data", function() {
                if(def_part_details_results.hasData()) {
                        var def_p_details = def_part_details_results.data().rows;
                        defaultTokenModel.set("tok_uc_id",def_p_details[0][0])
                        defaultTokenModel.set("tok_part_0_label",def_p_details[0][1])
                        defaultTokenModel.set("tok_part_1_label",def_p_details[0][2])
                        defaultTokenModel.set("tok_part_2_label",def_p_details[0][3])
                        defaultTokenModel.set("tok_part_3_label",def_p_details[0][4])
                        defaultTokenModel.set("tok_part_4_label",def_p_details[0][5])
                        defaultTokenModel.set("tok_part_5_label",def_p_details[0][6])
                        defaultTokenModel.set("tok_part_6_label",def_p_details[0][7])
                        defaultTokenModel.set("tok_part_7_label",def_p_details[0][8])
                        var pre_build_b_vid = def_p_details[0][9];
                        var pre_build_b_view = def_p_details[0][10];
                        var pre_build_b_srch = def_p_details[0][11];
                        var pre_build_b_dash = def_p_details[0][12];
                        var pre_build_b_rpt = def_p_details[0][13];
                        var pre_build_init_show = def_p_details[0][14];
                            if(pre_build_b_vid!="undefined"){
                                //setToken("tok_pre_build_b_vid",pre_build_b_vid,false)
                                var obj_b_vid = '<iframe id="content_dyn_vid_object" width="98%;" height="600px;" src="' + pre_build_b_vid + '" border="1" frameborder="2" style="display: inline;overflow:scroll;min-height:600px;"></iframe>'
                                $("#content_vid_object").html(obj_b_vid)
                            }
                            if(pre_build_b_view!="undefined"){
                                //setToken("tok_pre_build_b_view",pre_build_b_view,false)
                                var obj_b_view = '<iframe id="content_dyn_view_object" width="98%;" height="600px;" src="' + pre_build_b_view + '" border="1" frameborder="2" style="display: inline;overflow:scroll;min-height:600px;"></iframe>'
                                $("#content_view_object").html(obj_b_view)
                            }                
                            if(pre_build_b_srch!="undefined"){
                                //setToken("tok_pre_build_b_srch",pre_build_b_srch,false)
                                var obj_b_srch = '<iframe id="content_dyn_srch_object" width="98%;" height="600px;" src="' + pre_build_b_srch + '" border="1" frameborder="2" style="display: inline;overflow:scroll;min-height:600px;"></iframe>'
                                $("#content_srch_object").html(obj_b_srch)
                            }
                            if(pre_build_b_dash!="undefined"){
                                //setToken("tok_pre_build_b_dash",pre_build_b_dash,false)
                                var obj_b_dash = '<iframe id="content_dyn_dash_object" width="98%;" height="600px;" src="' + pre_build_b_dash + '" border="1" frameborder="2" style="display: inline;overflow:scroll;min-height:600px;"></iframe>'
                                $("#content_dash_object").html(obj_b_dash)
                            }
                            if(pre_build_b_rpt!="undefined"){
                                //setToken("tok_pre_build_b_rpt",pre_build_b_rpt,false)
                                var obj_b_rpt = '<iframe id="content_dyn_rpt_object" width="98%;" height="600px;" src="' + pre_build_b_rpt + '" border="1" frameborder="2" style="display: inline;overflow:scroll;min-height:600px;"></iframe>'
                                $("#content_rpt_object").html(obj_b_rpt)
                                    //$("#content_dyn_rpt_object").hide()
                            } 
                            if(pre_build_init_show!="undefined"){
                                var pre_build_init_id="#content_"+pre_build_init_show
                                $(pre_build_init_id).show();
                            }
                        };
            });
        }); 
        src_part_states.on('search:done', function(properties) {
            var def_part_state_results = src_part_states.data("results");
            def_part_state_results.on("data", function() {
                if(def_part_state_results.hasData()) {
                    var def_p_state = def_part_state_results.data().rows;
                    setToken("tok_next_part",def_p_state[0][0],false) 	//next_part 
                    setToken("tok_previous_part",def_p_state[0][1],false) 	//previous_part 
                    setToken("tok_show_part_next_btn",def_p_state[0][2],false) 	//show_part_next_btn 
                    setToken("tok_label_part_next_btn",def_p_state[0][3],false) 	//label_part_next_btn 
                    setToken("tok_show_part_prev_btn",def_p_state[0][4],false) 	//show_part_prev_btn 
                    setToken("tok_total_parts",def_p_state[0][5],false) 	//total_parts 
                    setToken("tok_set_part_0_tok",def_p_state[0][6],false) 	//set_part_0_tok 
                    setToken("tok_part_0_state",def_p_state[0][7],false) 	//part_0_state
                    setToken("tok_set_part_1_tok",def_p_state[0][8],false) 	//set_part_1_tok 
                    setToken("tok_part_1_state",def_p_state[0][9],false) 	//part_1_state 
                    setToken("tok_part_1_compl",def_p_state[0][10],false) 	//part_1_compl 
                    setToken("tok_set_part_2_tok",def_p_state[0][11],false) 	//set_part_2_tok 
                    setToken("tok_part_2_state",def_p_state[0][12],false) 	//part_2_state 
                    setToken("tok_part_2_compl",def_p_state[0][13],false) 	//part_2_compl 
                    setToken("tok_set_part_3_tok",def_p_state[0][14],false) 	//set_part_3_tok 
                    setToken("tok_part_3_state",def_p_state[0][15],false) 	//part_3_state 
                    setToken("tok_part_3_compl",def_p_state[0][16],false) 	//part_3_compl 
                    setToken("tok_set_part_4_tok",def_p_state[0][17],false) 	//set_part_4_tok 
                    setToken("tok_part_4_state",def_p_state[0][18],false) 	//part_4_state 
                    setToken("tok_part_4_compl",def_p_state[0][19],false) 	//part_4_compl 
                    setToken("tok_set_part_5_tok",def_p_state[0][20],false) 	//set_part_5_tok 
                    setToken("tok_part_5_state",def_p_state[0][21],false) 	//part_5_state 
                    setToken("tok_part_5_compl",def_p_state[0][22],false) 	//part_5_compl 
                    setToken("tok_set_part_6_tok",def_p_state[0][23],false) 	//set_part_6_tok 
                    setToken("tok_part_6_state",def_p_state[0][24],false) 	//part_6_state 
                    setToken("tok_part_6_compl",def_p_state[0][25],false) 	//part_6_compl 
                    setToken("tok_set_part_7_tok",def_p_state[0][26],false) 	//set_part_7_tok 
                    setToken("tok_part_7_state",def_p_state[0][27],false) 	//part_7_state 
                    setToken("tok_part_7_compl",def_p_state[0][28],false) 	//part_7_compl 
                    setToken("tok_part_compl_name",def_p_state[0][29],false)//part_id_name
                };
            });
        });
        src_step_states.on('search:done', function(properties) { 
            var def_step_state_results = src_step_states.data("results"); 
            def_step_state_results.on("data", function() { 
                if(def_step_state_results.hasData()) {
                        var def_s_state = def_step_state_results.data().rows;
                        setToken("tok_next_step",def_s_state[0][0],false)
                        setToken("tok_previous_step",def_s_state[0][1],false)
                        var show_sub_panels=def_s_state[0][2]
                        var show_panel_left=def_s_state[0][3]
                        var show_panel_single=def_s_state[0][4]
                        var show_right_page=def_s_state[0][5]
                        var show_right_object=def_s_state[0][6]
                        var show_sub_steps=def_s_state[0][7]                            
                        setToken("tok_panel_left_link",def_s_state[0][8],false)
                        setToken("tok_panel_right_link",def_s_state[0][9],false)
                        setToken("tok_panel_single_link",def_s_state[0][10],false)
                        var emb_object_src=def_s_state[0][11]
                        var emb_object_type=def_s_state[0][12]
                        var emb_object_title=def_s_state[0][13]
                        var combo_right_object=def_s_state[0][14]    
                        setToken("tok_show_step_next_part_btn",def_s_state[0][15],false)
                        setToken("tok_show_step_next_btn",def_s_state[0][16],false)
                        setToken("tok_show_step_prev_btn",def_s_state[0][17],false)
                        setToken("tok_show_step_0",def_s_state[0][18],false)
                        setToken("tok_show_step_1",def_s_state[0][19],false)
                        setToken("tok_show_step_2",def_s_state[0][20],false)
                        setToken("tok_show_step_3",def_s_state[0][21],false)
                        setToken("tok_show_step_4",def_s_state[0][22],false)
                        setToken("tok_show_step_5",def_s_state[0][23],false)
                        setToken("tok_show_step_6",def_s_state[0][24],false)
                        setToken("tok_show_step_7",def_s_state[0][25],false)
                        setToken("tok_show_step_8",def_s_state[0][26],false)

                        if(show_sub_panels==="T"){
                            if(show_panel_single==="T"){
                                $("#row_single").show()
                                $("#row_sub").hide()
                            } else {
                                $("#row_single").hide()
                                $("#row_sub").show()
                                if(show_panel_left==="T") {
                                    $("#pan_left").show()
                                } else { 
                                    $("#pan_left").hide()
                                }
                                if(show_right_page==="T") {
                                    $("#pan_right_p_o").show()
                                    //$("#h_r_n_page").show()
                                    //$("#h_r_n_page .panel-body.html").show();                            
                                } else { 
                                    $("#pan_right_p_o").hide()
                                    //$("#h_r_n_page").hide()
                                    //$("#h_r_n_page .panel-body.html").hide();      
                                }
                                if(show_right_object==="T") { 
                                    set_emb_f_panel(emb_object_type,emb_object_src,emb_object_title) 
                                } else {
                                    $("#pan_right_f").hide()
                                    $("#content_dyn_f_title").hide() 
                                    if(combo_right_object==="T"){
                                        $("#h_r_o_object").hide()
                                    }
                                }
                                if(show_sub_steps==="T") {
                                    $("#ms_ad_obj_sub_step_wizard").show()
                                    //$("#ms_ad_obj_sub_step_wizard_holder").show()
                                } else { 
                                    $("#ms_ad_obj_sub_step_wizard").hide()
                                    //$("#ms_ad_obj_sub_step_wizard_holder").hide()
                                }
                            }
                        } else { 
                                $("#row_single").hide()
                                $("#row_sub").hide()
                        } 
                };
            });
        }); 
        function set_emb_f_panel(obj_type,obj_src,obj_title) { 
            $("#pan_right_f").show();
            $("#h_r_f_object").show();            
            $("#pan_right_p_o").hide();
            $("#content_vid_object").hide(); 
            $("#content_srch_object").hide();
            $("#content_view_object").hide();
            $("#content_dash_object").hide(); 
            $("#content_rpt_object").hide();
            //$("#h_r_s_object").hide();
            var obj_h_id='#content_'+obj_type
            var obj_dyn_id='content_dyn_'+obj_type
            var obj_dyn_h_id='#content_dyn_'+obj_type
            if(obj_src!="undefined"){
                $(obj_dyn_h_id).attr("src",obj_src);
            }
            var obj_w_title_temp = '<h1 id="content_dyn_f_title" style="text-align:center;font-family:proxima_nova;padding:5px 10px 5px 10px;box-sizing: border-box !important;box-shadow: 1px 1px 7px -1px rgb(198,211,222,1) !important;box-sizing: border-box;display: block;margin: 5px 10px 5px 10px;"><b><i>'+obj_title+'</i></b></h1><object id="content_dyn_f_object" width="98%;" height="570px;" data="' + obj_src + '" border="1" frameborder="2" style="display: inline;overflow:scroll;min-height:570px;"></object>'            
                if(obj_title==="none"){
                    $("#content_dyn_f_title").hide()
                } else {
                    $(obj_dyn_h_id).html(obj_w_title_temp)
                    $("#content_dyn_f_title").show()
                }
            $(obj_h_id).show(); 
            $(obj_dyn_h_id).show()
        }         
    });
}); 