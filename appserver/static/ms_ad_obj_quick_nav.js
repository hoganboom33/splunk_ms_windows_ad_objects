 require([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/simplexml/ready!'
], function(_,$, mvc) {
    $(document).ready(function () {
        var defaultTokenModel = mvc.Components.get("default");
        var submittedTokenModel = mvc.Components.get("submitted");
        $("[id^=nav_part_r_]").hide();
        $("#nav_part_r_0").show();
        submittedTokenModel.set("tok_get_cfg", "true")
        $("#nav_top_prev_btn").prop('disabled', true)
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
        // Get Configuration Preset Values
        function nav_upd_top(p_dir,p_t_old_id,p_t_new_id,p_t_btn_prev_id,p_t_btn_prev_st,p_t_trg_use,p_t_trg_tok,p_t_trg_tok_val,p_max_compl) {
            var part_new_show = '[id^=nav_part_r_'+p_t_new_id+']'
            var part_new_cont = '#nav_top_part_cont_'+p_t_new_id
            var part_old_cont = '#nav_top_part_cont_'+p_t_old_id
            var part_prev_btn = '#'+p_t_btn_prev_id
            $(part_new_show).show();
            $(part_old_cont).removeClass("active")
            $(part_old_cont).addClass("completed")
            $(part_new_cont).addClass("active")
            if(p_t_btn_prev_st==="disabled"){
                $(part_prev_btn).prop('disabled', true)
            } else {
                $(part_prev_btn).prop('disabled', false)
            }
            if(p_t_trg_use){
                setToken(p_t_trg_tok, p_t_trg_tok_val);
            }
            if(p_max_compl){
                $(part_new_cont).addClass("completed")
            }
            setToken("tok_cur_part", p_t_new_id);
        }
        defaultTokenModel.on("change:tok_t_nav_btn_next_st", function(e) {
            var next_btn_st=defaultTokenModel.get("tok_t_nav_btn_next_st")
            if(next_btn_st==="disabled"){
                $("#nav_top_next_btn").prop('disabled', true)
                $("#nav_top_next_btn").show();
            } else if(next_btn_st==="enabled"){
                $("#nav_top_next_btn").prop('disabled', false)
                $("#nav_top_next_btn").show();
            } else if(next_btn_st==="hidden"){
                $("#nav_top_next_btn").prop('disabled', false)
                $("#nav_top_next_btn").hide();
            }
        });
        $('.dashboard-body').on('click', '[data-obj-top-nav],[data-obj-top-nav-max]', function(ms_ad_obj_nav) {
            var target = $(ms_ad_obj_nav.currentTarget);
            var part_exec = target.data('obj-top-nav');
            var part_max_txt = String(target.data('obj-top-nav-max'));
            var part_cur_txt = String(defaultTokenModel.get("tok_cur_part"));
            var part_max_nmb = Number(part_max_txt);
            var part_cur_nmb = Number(part_cur_txt);
            var part_next_nmb=part_cur_nmb+1
            var part_prev_nmb=part_cur_nmb-1
            var part_next_txt=String(part_next_nmb)
            var part_prev_txt=String(part_prev_nmb)
            $("[id^=nav_part_r_]").hide();
            setToken("tok_show_man_domain_update", undefined);
            if(part_exec==="PrevPart"){
                setToken("tok_t_nav_btn_next_st", "enabled");
                if(part_cur_txt==="1"){
                    nav_upd_top(part_exec,part_cur_txt,part_prev_txt,"nav_top_prev_btn","disabled",false,"","",false)
                } else {
                    nav_upd_top(part_exec,part_cur_txt,part_prev_txt,"nav_top_prev_btn","enabled",false,"","",false)
                }
            } else {
                var part_btn_next_st= "tok_t_nav_"+part_next_txt+"_btn_next_st"
                var tok_next_st = String(defaultTokenModel.get(part_btn_next_st));
                setToken("tok_t_nav_btn_next_st", tok_next_st);
                if(part_cur_txt==="0"){
                    nav_upd_top(part_exec,part_cur_txt,part_next_txt,"nav_top_prev_btn","enabled",false,"","",false)
                } else if(part_next_txt==="2"){
                    nav_upd_top(part_exec,part_cur_txt,part_next_txt,"nav_top_prev_btn","enabled",true,"tok_check_mac_trigger","3",false)
                } else if(part_next_txt==="4"){
                    nav_upd_top(part_exec,part_cur_txt,part_next_txt,"nav_top_prev_btn","enabled",true,"tok_check_mac_trigger","5",false)
                } else if(part_next_txt===part_max_txt){
                    nav_upd_top(part_exec,part_cur_txt,part_next_txt,"nav_top_prev_btn","enabled",false,"","",true)
                } else {
                    nav_upd_top(part_exec,part_cur_txt,part_next_txt,"nav_top_prev_btn","enabled",false,"","",false)
                }                
            }
        }); 
    });	
});