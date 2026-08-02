require(["jquery", 
"splunkjs/mvc",
"splunkjs/mvc/searchmanager",
"splunkjs/mvc/postprocessmanager",
'splunkjs/mvc/tableview',
'../app/ms_windows_ad_objects/components/ms_ad_obj_modal/ms_ad_obj_modal_popup',
"splunkjs/mvc/simplexml/ready!"], 
function($, mvc,SearchManager,PostProcessManager, TableView, ms_ad_obj_modal_preview) {
$(document).ready(function () {
    var defaultTokenModel = mvc.Components.get("default");
    var submitTokenModel = mvc.Components.get("submitted");
    var tokens = {
    get: function(tokenName) {
        return defaultTokenModel.get(tokenName);
    },

    set: function(tokenName, tokenValue) {
        defaultTokenModel.set(tokenName, tokenValue);
        submitTokenModel.set(tokenName, tokenValue);
        }, 
        on: function(eventName, callback) { 
            defaultTokenModel.on(eventName, callback); 
        }
    };
    var envTokenModel = mvc.Components.get('env');
    const val_user_id=envTokenModel.get('user');
    var bs_ad_upd_dom_list = new SearchManager({
        id: 'bs_ad_upd_dom_list',
        search: "| makeresults | eval domain=\"hold\",kv_suffix=\"hold\",dc_val=\"hold\",multi_lkps_enabled=\"f\" | outputlookup tmp_ms_obj_md_cfg.csv",
        //cache: true,
        preview: true,
        //autostart: true,
    });	
    var chk_dc_val_srch = new SearchManager({
        id: 'chk_dc_val_srch',
        search: "| makeresults | eval hold=\"hold\"",
        //cache: true,
        preview: true,
        autostart: false
    });
    // Build HTML Tables for Configuration Tabs
    var bs_h_list = new PostProcessManager({
    id: 'bs_h',
    managerid: "base_ad_h",
    //cache: true,
    preview: true,
    //autostart: true,
    });
    // Build HTML Table For Populate and Remove Configurations
    var ppl_h_list = new PostProcessManager({
        id: 'ppl_h',
        managerid: "kv_create",
        search: "|`ms_obj_kv_cfg_ppl_rem_h`",
        //cache: true,
        preview: true,
        //autostart: true,
    });
    // ----  Check admon Domain Filter --- //
    var sub_chk_dc_val = new PostProcessManager({
        id: 'sub_check_dc_val',
        managerid: "check_dc_val",
        //cache: true,
        preview: true,
        //autostart: true,
    });
    // ----  Show Config Settings --- //
    var sub_cfg_h_tbls = new PostProcessManager({
        id: 'sub_confg_h_tbls',
        managerid: "kv_create",
        search: "|`ms_obj_cfg_filter_md_h_tbls`",
        //cache: true,
        preview: true,
        //autostart: true,
    });
    // ----  Save Config Changes --- //
    var upd_dom_table_val = new PostProcessManager({
        id: 'upd_dom_table_val',
        managerid: "upd_dom_table",
        //cache: true,
        preview: true,
        //autostart: true,
    });
    // ----  Population Search --- //
    var ppl_lkp_srch_val = new PostProcessManager({
        id: 'ppl_lkp_srch_val',
        managerid: "ppl_lkp_srch",
        //cache: true,
        preview: true,
        //autostart: true,
    });
    upd_dom_table_val.on('search:done', function(properties) {
        $(".md-cfg-save-spin").addClass("hidden")
        $(".md-cfg-save").addClass("hidden")

    });
    sub_chk_dc_val.on('search:progress', function(properties) {
        var chk_dc_dom=defaultTokenModel.get("tok_chk_dc_val_dom")
        var chk_dc_spin=".chk_dc_run_spin_"+chk_dc_dom
        var chk_dc_btn=".chk_dc_verify_"+chk_dc_dom
        $(chk_dc_spin).removeClass("hidden")
        $(chk_dc_btn).addClass("hidden")
    });
    sub_chk_dc_val.on('search:done', function(properties,ms_ad_obj_modal_pop) {
        var chk_dc_dom=defaultTokenModel.get("tok_chk_dc_val_dom")
        var chk_dc_spin=".chk_dc_run_spin_"+chk_dc_dom
        var chk_dc_btn=".chk_dc_verify_"+chk_dc_dom
        $(chk_dc_btn).removeClass("hidden")
        $(chk_dc_spin).addClass("hidden")
        var srch_chk_dc=1
        var srch_chk_dc_nd=1
        var target = $(ms_ad_obj_modal_pop.currentTarget);
        t_modal = "cfg_dc_val_chk_mod_hold_pop";
        if (properties.content.resultCount > 0) {
            var sub_srch_dc_chk_results = sub_chk_dc_val.data("results");
            sub_srch_dc_chk_results.on("data", function() {
                if(srch_chk_dc<2){
                    srch_chk_dc=srch_chk_dc+1
                    var tbl_chk_dc_vals = sub_srch_dc_chk_results.data().rows;
                    var h_tp_tbl_rw= new Array()
                    for (i=0;i<tbl_chk_dc_vals.length;i++) {
                        var res_dc_val = tbl_chk_dc_vals[i][0]
                        var res_obj_cat = tbl_chk_dc_vals[i][1]
                        var h_chk_rw='<tr class=\"domsetvrw\">'+
                        '<td class=\"chkresvcol\">'+res_dc_val+'</td>'+
                        '<td class=\"chkresvcol\"><b>'+res_obj_cat+'</b></td>'
                        h_tp_tbl_rw.push(h_chk_rw)
                    }
                    var chk_rw=h_tp_tbl_rw.join("")
                    var chk_hdr_rw='<tr class=\"mddomsinpsettoprow\"><th style=\"width:10% !important;background-color: #FDE6D9;\"><center>dc_val</center></th><th style=\"width:10%;background-color: #FDE6D9;\"><center>objectCategory</center></th></tr>'
                    var chk_h_tbl = '<table class=\"mddominpsettoptbl\" style=\"width:95% !important;\">'+chk_hdr_rw+' '+chk_rw+'</table>'
                    $("#chkdcvalres").html(chk_h_tbl)
                    var t_m_obj=document.getElementById(t_modal);
                    var t_obj_i_html=t_m_obj.innerHTML
                    var prev_ms_ad_obj_modal = new ms_ad_obj_modal_preview({ t_title: t_modal,t_inner_p_html: t_obj_i_html});
                    prev_ms_ad_obj_modal.show();
                }
            })
        } else {
            if(srch_chk_dc_nd<2){
                srch_chk_dc_nd=srch_chk_dc_nd+1
                $("#chkdcvalres").html("NO RESULTS FOUND")
                var t_m_obj=document.getElementById(t_modal);
                var t_obj_i_html=t_m_obj.innerHTML
                var prev_ms_ad_obj_modal = new ms_ad_obj_modal_preview({ t_title: t_modal,t_inner_p_html: t_obj_i_html});
                prev_ms_ad_obj_modal.show();
            }
        }
    })          
    function updateenaCollection (dom_sel_id, sel_type) {
        var upd_dom_sel=[]
        dom_sel_id = String(dom_sel_id)
        tok_dom_sel = defaultTokenModel.get("tok_dom_array");
        if(tok_dom_sel!=undefined){
            upd_dom_sel=tok_dom_sel.split(",")
        }
        if (sel_type === "Add") {
            if(tok_dom_sel===undefined){
                upd_dom_sel.push(dom_sel_id);
            } else if (upd_dom_sel.indexOf(dom_sel_id) === -1) {
                upd_dom_sel.push(dom_sel_id);
            }
        } else {
            if(tok_dom_sel!=undefined){
                var i = upd_dom_sel.indexOf(dom_sel_id);
                if(i != -1) {
                    upd_dom_sel.splice(i, 1);
                }
            }
        }
        if(upd_dom_sel && upd_dom_sel!=""){
            upd_dom_sel = upd_dom_sel.join(',')
            defaultTokenModel.set("tok_dom_array", upd_dom_sel);
            submitTokenModel.set("tok_dom_array", upd_dom_sel);
        } else {
            defaultTokenModel.set("tok_dom_array", undefined);
            submitTokenModel.set("tok_dom_array", undefined);
        }
    }
    bs_h_list.on('search:done', function(properties) {
    var srch_h=1
    if (properties.content.resultCount > 0) {
        var sub_srch_ad_h_results = bs_h_list.data("results");
        sub_srch_ad_h_results.on("data", function() {
            if(srch_h<2){
                srch_h=srch_h+1
                var tbl_ad_h_list_vals = sub_srch_ad_h_results.data().rows;
                var inp_h = tbl_ad_h_list_vals[0][0]
                $("#setmdinputs").html(inp_h)
            }
        })
    }
    })
    sub_cfg_h_tbls.on('search:done', function(properties) {
    var srch_h_tbls=1
    if (properties.content.resultCount > 0) {
        var sub_cfg_h_tbls_results = sub_cfg_h_tbls.data("results");
        sub_cfg_h_tbls_results.on("data", function() {
            if(srch_h_tbls<2){
                srch_h_tbls=srch_h_tbls+1
                var sub_cfg_h_tbls_vals = sub_cfg_h_tbls_results.data().rows;
                var coll_h = sub_cfg_h_tbls_vals[0][0]
                var trans_h = sub_cfg_h_tbls_vals[0][1]
                var def_srch_h = sub_cfg_h_tbls_vals[0][2]
                var new_srch_h = sub_cfg_h_tbls_vals[0][3]
                $("#cfgcollh").html(coll_h)
                $("#cfgtransh").html(trans_h)
                $("#cfgdefsrchh").html(def_srch_h)
                $("#cfgnewsrchh").html(new_srch_h)
            }
        })
    }
    })
    ppl_h_list.on('search:done', function(properties) {
        var srch_ppl_h=1
        if (properties.content.resultCount > 0) {
            var ppl_h_list_results = ppl_h_list.data("results");
            ppl_h_list_results.on("data", function() {
                if(srch_ppl_h<2){
                    srch_ppl_h=srch_ppl_h+1
                    var ppl_h_list_vals = ppl_h_list_results.data().rows;
                    var ppl_h = ppl_h_list_vals[0][0]
                    $("#ppltbls").html(ppl_h)
                }
            })
        }
    })    
    $('.dashboard-body').on('change', '[data-inp-md-set],[data-inp-md-dom]', function(e) {
        e.preventDefault();
        var inp_set_value = $(this).val();
        var inp_set_fld=$(this).data('inp-md-set');
        var inp_set_dom=$(this).data('inp-md-dom');
        var cur_kv_suffix = defaultTokenModel.get("tok_upd_kv_suffix")
        var cur_dc_val = defaultTokenModel.get("tok_upd_dc_val")
        defaultTokenModel.set("tok_show_cfg_save_tab","true")
        $(".md-cfg-save").removeClass("hidden")
        if(inp_set_fld==="kv_suffix"){
            var user_lkp_new="AD_Obj_User_"+inp_set_value
            var group_lkp_new="AD_Obj_Group_"+inp_set_value
            var computer_lkp_new="AD_Obj_Computer_"+inp_set_value
            var tgt_user_lkp_h=".chk-dom-"+inp_set_dom+"-userlkp"
            var tgt_group_lkp_h=".chk-dom-"+inp_set_dom+"-grouplkp"
            var tgt_computer_lkp_h=".chk-dom-"+inp_set_dom+"-computerlkp"
            $(tgt_user_lkp_h).html(user_lkp_new)
            $(tgt_group_lkp_h).html(group_lkp_new)
            $(tgt_computer_lkp_h).html(computer_lkp_new)
            if(cur_kv_suffix===undefined){
                var new_kv_suffix=inp_set_dom+":kv_suffix="+inp_set_value
                defaultTokenModel.set("tok_upd_kvsuff_array",new_kv_suffix)
                submitTokenModel.set("tok_upd_kvsuff_array",new_kv_suffix)
            } else {
                var new_kv_suffix=cur_kv_suffix+"|"+inp_set_dom+":kv_suffix="+new_kv_suffix
                defaultTokenModel.set("tok_upd_kvsuff_array",new_kv_suffix)
                submitTokenModel.set("tok_upd_kvsuff_array",new_kv_suffix)
            }
        }
        if(inp_set_fld==="dc_val"){
            if(cur_dc_val===undefined){
                var new_dc_val=inp_set_dom+":dc_val="+inp_set_value
                defaultTokenModel.set("tok_upd_dc_array",new_dc_val)
                submitTokenModel.set("tok_upd_dc_array",new_dc_val)
            } else {
                var hide_old=cur_dc_val.replace(inp_set_dom+":","updatedobj:")
                var upd_dc_val=hide_old+"|"+inp_set_dom+":dc_val="+inp_set_value
                defaultTokenModel.set("tok_upd_dc_array",upd_dc_val)
                submitTokenModel.set("tok_upd_dc_array",upd_dc_val)
            }
        }
    });
    $(document).on("click","[data-inp-chk-dc]", function(e) {
        e.preventDefault();
        var dc_val_chk_id=$(this).data('inp-chk-dc');
        var dc_val_chk_hid="#dcvalinp"+dc_val_chk_id
        var dc_val_chk=$(dc_val_chk_hid).val();
        defaultTokenModel.set("tok_dc_val_chk",dc_val_chk)
        submitTokenModel.set("tok_dc_val_chk",dc_val_chk)
        defaultTokenModel.set("tok_chk_dc_val_dom",dc_val_chk_id)
        submitTokenModel.set("tok_chk_dc_val_dom",dc_val_chk)
        });
        $(document).on("click","[data-cfg-md-save]", function(e) {
        e.preventDefault();
        $(".md-cfg-save").addClass("hidden")
        $(".md-cfg-save-spin").removeClass("hidden")
        var dc_val_chk_id=$(this).data('cfg-md-save');
        defaultTokenModel.set(dc_val_chk_id,"true")
        submitTokenModel.set(dc_val_chk_id,"true")
    });
    $(document).on("click","[data-ppl-dom],[data-ppl-src],[data-ppl-dest],[data-ppl-type],[data-ppl-tgt],[data-ppl-suff],[data-ppl-dcval],[data-ppl-tgt-up]", function(e) {
        e.preventDefault();
        $(".ppl_lkp_btn").addClass("hidden")
        var ppl_dom=$(this).data('ppl-dom');
        var ppl_src=$(this).data('ppl-src');
        var ppl_dest=$(this).data('ppl-dest');
        var ppl_type=$(this).data('ppl-type');
        var ppl_tgt=$(this).data('ppl-tgt');
        var ppl_tgt_up=$(this).data('ppl-tgt-up');
        var ppl_suff=$(this).data('ppl-suff');
        var ppl_dcval=$(this).data('ppl-dcval');
        var ppl_bs=ppl_tgt+"_"+ppl_dom
        var ppl_st=".ppl_"+ppl_bs+"_st"
        var ppl_spin=".ppl_"+ppl_bs+"_spin"
        var ppl_btn=".ppl_"+ppl_bs+"_btn"
        $(ppl_spin).addClass("running")
        if(ppl_type==="mgt"){
            $(ppl_spin).removeClass("hidden")
            defaultTokenModel.set("tok_ppl_bs","ppl_"+ppl_bs)
            var ppl_mgt_srch_lbl="| inputlookup "+ppl_src+" WHERE domain=\""+ppl_dom+"\" | eval _key=objectGUID.\"#\".DomainDNSName | outputlookup "+ppl_dest
            var ppl_mgt_srch=ppl_mgt_srch_lbl+" | fields | stats count| eval tgt_st=\""+ppl_st+"\",tgt_btn=\""+ppl_btn+"\",tgt_msg=\"(\".tostring(count,\"commas\").\" "+ppl_tgt_up+"s Migrated into "+ppl_dest+" lookup)\"| table tgt_st,tgt_btn,count,tgt_msg"
            tokens.set("tok_ppl_search_lbl",ppl_mgt_srch_lbl)
            tokens.set("tok_ppl_search_btn",ppl_btn)
            execpplsearch(ppl_mgt_srch,ppl_dom,ppl_type,ppl_tgt)
        } else if(ppl_type==="ad"){
            $(ppl_spin).removeClass("hidden")
            tokens.set("tok_ppl_bs","ppl_"+ppl_bs)
            var ppl_ad_srch_lbl="`ms_obj_md_admon_bld_upd_out(\""+ppl_dom+"\",\""+ppl_dcval+"\","+ppl_tgt+","+ppl_tgt_up+")`"
            var ppl_ad_srch=ppl_ad_srch_lbl+" | fields | stats count | eval tgt_st=\""+ppl_st+"\",tgt_btn=\""+ppl_btn+"\",tgt_msg=\"(\".tostring(count,\"commas\").\" "+ppl_dom+" domain "+ppl_tgt_up+"s Added into "+ppl_dest+" lookup)\"| table tgt_st,tgt_btn,count,tgt_msg| table tgt_st,tgt_btn,count,tgt_msg"
            tokens.set("tok_ppl_search_lbl",ppl_ad_srch_lbl)
            tokens.set("tok_ppl_search_btn",ppl_btn)
            execpplsearch(ppl_ad_srch,ppl_dom,ppl_type,ppl_tgt)
        } else if(ppl_type==="rem"){
            var rem_spin=".rem_"+ppl_bs+"_spin"
            $(rem_spin).removeClass("hidden")
            defaultTokenModel.set("tok_ppl_bs","rem_"+ppl_bs)
            var rem_st=".rem_"+ppl_bs+"_st"
            var rem_btn=".rem_"+ppl_bs+"_btn"
            var rem_srch_lbl="| inputlookup "+ppl_dest+" WHERE domain!=\""+ppl_dom+"\" | eval _key=objectGUID.\"#\".DomainDNSName | outputlookup "+ppl_dest+" "
            var rem_srch=rem_srch_lbl+"| fields | stats count AS no_cnt| eval count=2,tgt_st=\""+rem_st+"\",tgt_btn=\""+rem_btn+"\",tgt_msg=\"("+ppl_dom+" Domain "+ppl_tgt+"s Removed from "+ppl_dest+" lookup)\"| table tgt_st,tgt_btn,count,tgt_msg"
            defaultTokenModel.set("tok_ppl_search_lbl",rem_srch_lbl)
            defaultTokenModel.set("tok_ppl_search_btn",rem_btn)
            execpplsearch(rem_srch,ppl_dom,ppl_type,ppl_tgt)
        }
    });
    $(document).on("click","[data-toggle],[data-onstyle],[data-offstyle],[data-toggle-tgt]", function(e) {
        e.preventDefault();
        var tog_chk=$(this).data('toggle');
        var tog_on=$(this).data('onstyle');
        var tog_off=$(this).data('offstyle');
        var tog_tgt=$(this).data('toggle-tgt');
        var tog_tgt_def=".chk-dom-"+tog_tgt+"def"
        var tog_tgt_inp=".chk-dom-"+tog_tgt+"inp"
        var tog_val=$(this).val();
        var cur_ena_array=defaultTokenModel.get("tok_upd_ena_array")
        var cur_dis_array=defaultTokenModel.get("tok_upd_dis_array")
        defaultTokenModel.set("tok_show_cfg_save_tab","true")
        $(".md-cfg-save").removeClass("hidden")
        if($(this).attr('class')==="toggle btn btn-danger off"){
            $(this).removeClass("btn-danger off");
            $(this).addClass("btn-success");
            $(tog_tgt_def).addClass("hidden")
            $(tog_tgt_inp).removeClass("hidden")
            if(cur_ena_array===undefined){
                defaultTokenModel.set("tok_upd_ena_array",tog_tgt)
                submitTokenModel.set("tok_upd_ena_array",tog_tgt)
            } else {
                var n_arry=cur_ena_array+","+tog_tgt
                defaultTokenModel.set("tok_upd_ena_array",n_arry)
                submitTokenModel.set("tok_upd_ena_array",n_arry)
            }
            if(cur_dis_array!=undefined){
                var upd_dis_arry=cur_dis_array.replace(tog_tgt,"")
                defaultTokenModel.set("tok_upd_dis_array",upd_dis_arry)
                submitTokenModel.set("tok_upd_dis_array",upd_dis_arry)
            } else {
                defaultTokenModel.set("tok_upd_dis_array","")
                submitTokenModel.set("tok_upd_dis_array","")
            }
        }
        else {
            $(this).removeClass("btn-success");
            $(this).addClass("btn-danger off");
            $(tog_tgt_inp).addClass("hidden")
            $(tog_tgt_def).removeClass("hidden")
            if(cur_ena_array!=undefined){
                var upd_arry=cur_ena_array.replace(tog_tgt,"")
                defaultTokenModel.set("tok_upd_ena_array",upd_arry)
                submitTokenModel.set("tok_upd_ena_array",upd_arry)
            } else {
                defaultTokenModel.set("tok_upd_ena_array","")
                submitTokenModel.set("tok_upd_ena_array","")               
            }
            if(cur_dis_array===undefined){
                defaultTokenModel.set("tok_upd_dis_array",tog_tgt)
                submitTokenModel.set("tok_upd_dis_array",tog_tgt)
            } else {
                var n_darry=cur_dis_array+","+tog_tgt
                defaultTokenModel.set("tok_upd_dis_array",n_darry)
                submitTokenModel.set("tok_upd_dis_array",n_darry)
            }
        }

        });  
    function execpplsearch(ppl_srch,ppl_dom,ppl_type,ppl_tgt) { 
        var srchbasepplupd = mvc.Components.get("base_upd_ppl_lkp");
        var h_tgt_btn=".ppl_"+ppl_tgt+"_"+ppl_dom+"_st"
        var h_tgt_rem_btn=".rem_"+ppl_tgt+"_"+ppl_dom+"_btn"
        var h_tgt_rem_st=".rem_"+ppl_tgt+"_"+ppl_dom+"_st"
        srchbasepplupd.settings.set("search", ppl_srch);
        srchbasepplupd.startSearch();
        srchbasepplupd.on('search:progress', function(properties) {
            var prog_base_upd_cnt=properties.content.resultCount
            var prog_base_upd_st=properties.content.dispatchState
            var prog_base_upd_msgs=properties.content.messages
            var prog_base_upd_msgs_flg=prog_base_upd_msgs.length
            var prog_base_upd_dur=Math.round(properties.content.runDuration)
            if(prog_base_upd_msgs_flg==1){
                if(prog_base_upd_msgs[0].type=="INFO"){
                    prog_base_upd_msgs_flg=0
                }
            }
            if(prog_base_upd_msgs_flg>0){  
                $(".ppl_lkp_spin").addClass("hidden")
                $(".ppl_lkp_btn").removeClass("hidden")       
                var h_err_msg= "RunTime: "+prog_base_upd_dur+" Seconds"
                for (i=0;i<prog_base_upd_msgs_flg;i++)
                {
                    var m_err_type = prog_base_upd_msgs[i].type
                    var m_err_msg = prog_base_upd_msgs[i].text
                    h_err_msg=h_err_msg+"<br />"+m_err_type+": "+m_err_msg;
                }
                defaultTokenModel.set("tok_ppl_search_sev","Error")
                defaultTokenModel.set("tok_ppl_search_msg",h_err_msg)
                $(h_tgt_btn).removeClass("Pending")
                $(h_tgt_btn).addClass("iconwarn")
                $(".ppl_err_msg_val").html(h_err_msg)
                $(".ppl_err_msg").removeClass("hidden")
            } 
        });
        srchbasepplupd.on('search:done', function(properties) {
            var dn_base_upd_cnt=properties.content.resultCount
            $(".ppl_lkp_spin").addClass("hidden")
            $(".ppl_lkp_btn").removeClass("hidden")
            if (dn_base_upd_cnt > 0) {
                var srchbasepplupd_results = srchbasepplupd.data("results");
                srchbasepplupd_results.on("data", function() {
                    if(srchbasepplupd_results.data().rows){
                        var srchbasepplupd_vals = srchbasepplupd_results.data().rows;
                        var h_ppl_btn=srchbasepplupd_vals[0][1]
                        var h_ppl_cnt=srchbasepplupd_vals[0][2]
                        if(h_ppl_btn!=undefined){
                            $(".ppl_err_msg").addClass("hidden")
                            $(".ppl_lkp_btn").removeClass("hidden")
                            $(".ppl_lkp_spin").addClass("hidden")
                            var h_ppl_st=srchbasepplupd_vals[0][0]
                            var h_ppl_msg=srchbasepplupd_vals[0][3]
                            var h_ppl_st_msg_div=h_ppl_st+"_msg"
                            if(h_ppl_cnt>0){
                                var h_ppl_st_msg_h="<h2><i class=\"icon-check-circle iconchkcircle\"> "+h_ppl_msg+"</i></h2>"
                                $(h_ppl_st_msg_div).html(h_ppl_st_msg_h)
                                $(h_tgt_btn).removeClass("iconwarn")
                                $(h_tgt_btn).removeClass("Pending")
                                $(h_ppl_btn).addClass("Completed")
                                $(h_ppl_st).addClass("Completed")
                            } else {
                                var h_ppl_st_msg_h="<h2><i class=\"icon-error iconwarn\"> No "+ppl_tgt+"s found.</i></h2>"
                                $(h_ppl_st_msg_div).html(h_ppl_st_msg_h)
                                $(h_tgt_btn).removeClass("iconwarn")
                                $(h_tgt_btn).removeClass("Pending")
                                $(h_ppl_btn).addClass("Completed")
                                $(h_ppl_st).addClass("Completed")
                                if(ppl_type=="mgt"){
                                    var h_rem_st_msg_h="<h2><i class=\"icon-info iconwarn\"> No "+ppl_tgt+"s to remove from default lookup.</i></h2>"
                                    $(h_tgt_rem_st).html(h_rem_st_msg_h)
                                    $(h_tgt_rem_st).removeClass("Pending")
                                    $(h_tgt_rem_st).addClass("Completed")
                                    $(h_tgt_rem_btn).addClass("Completed")
                                }
                            }
                        }
                    }
                });
            };
            
        });
    };
    });
});