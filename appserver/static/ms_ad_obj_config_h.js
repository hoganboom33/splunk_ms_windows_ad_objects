require(["jquery", 
        "splunkjs/mvc",
        "splunkjs/mvc/searchmanager",
    	"splunkjs/mvc/postprocessmanager",
        "splunkjs/mvc/simplexml/ready!"], 
    function($, mvc,SearchManager,PostProcessManager) {
    var defaultTokenModel = mvc.Components.get("default");
    var submitTokenModel = mvc.Components.get("submitted");
	var envTokenModel = mvc.Components.get('env');
	var start_today = new Date();
	var sub_mac_chk_res = new PostProcessManager({
		id: 'sub_mac_chk_res',
		managerid: "bs_mac_chk_res",
		search: "| table all_mac_st,h_all_msg,h_table,h_nt_list",
		//cache: true,
		preview: true,
		//autostart: true,
	});
	var base_admon_check_srch = splunkjs.mvc.Components.get("base_admon_check");	
	base_admon_check_srch.on('search:progress', function(properties) {
		// Print just the event count from the search job
		$(".run_spin_sync_chk").removeClass("hidden")
	});	
	base_admon_check_srch.on('search:done', function(properties) {
		// Print the search job properties
		$(".run_spin_sync_chk").addClass("hidden")
	});
	var base_dom_hlth_check_srch = splunkjs.mvc.Components.get("domain_health_check");	
	base_dom_hlth_check_srch.on('search:progress', function(properties) {
		// Print just the event count from the search job
		$(".run_spin_dom_health_chk").removeClass("hidden")
		var dom_lkp_st = defaultTokenModel.get("tok_chk_d_dom_lkp_cls")
		if (dom_lkp_st == "chk_dm_lkp_ok"){
			defaultTokenModel.set("tok_chk_d_dom_health_msg","OK: AD_Obj_Domain Lookup Contains Data.")
		}
	});	
	base_dom_hlth_check_srch.on('search:done', function(properties) {
		$(".run_spin_dom_health_chk").addClass("hidden")
		var dom_dom_hlth_lim = 1
		if (properties.content.resultCount > 0) {
    		var dom_dom_hlth_results = base_dom_hlth_check_srch.data("results");
    		dom_dom_hlth_results.on("data", function() {
				if(dom_dom_hlth_lim<2){		
					dom_dom_hlth_lim = dom_dom_hlth_lim +1
				}
			});
		} else {
			var dom_lkp_st = defaultTokenModel.get("tok_chk_d_dom_lkp_cls")
			if(dom_lkp_st === "chk_dm_lkp_ok"){
				defaultTokenModel.set("tok_chk_d_dom_health_lbl","OK: AD_Obj_Domain Lookup Contains Data.")
				defaultTokenModel.set("tok_chk_d_dom_health_cls","chk_dm_health_ok")
			}
		}
	});
	var base_dom_lkp_a_check_srch = splunkjs.mvc.Components.get("first_domain_build");
	var base_dom_lkp_b_check_srch = splunkjs.mvc.Components.get("second_domain_build");
	var base_dom_lkp_c_check_srch = splunkjs.mvc.Components.get("third_domain_build");
	var base_dom_lkp_d_check_srch = splunkjs.mvc.Components.get("fourth_domain_build");
	base_dom_lkp_a_check_srch.on('search:progress', function(properties) {
		$(".run_spin_dom_chk").removeClass("hidden")
	});
	base_dom_lkp_b_check_srch.on('search:progress', function(properties) {
		$(".run_spin_dom_chk").removeClass("hidden")
	});
	base_dom_lkp_c_check_srch.on('search:progress', function(properties) {
		$(".run_spin_dom_chk").removeClass("hidden")
	});
	base_dom_lkp_d_check_srch.on('search:progress', function(properties) {
		$(".run_spin_dom_chk").removeClass("hidden")
	});
	base_dom_lkp_a_check_srch.on('search:done', function(properties) {
		var dom_lkp_a_lim = 1
		if (properties.content.resultCount > 0) {
    		var dom_lkp_a_results = base_dom_lkp_a_check_srch.data("results");
    		dom_lkp_a_results.on("data", function() {
				if(dom_lkp_a_lim<2){		
					dom_lkp_a_lim = dom_lkp_a_lim +1	
					$(".run_spin_dom_chk").addClass("hidden")
					defaultTokenModel.set("tok_chk_d_dom_health_lbl","OK: AD_Obj_Domain Lookup Contains Data.")
					defaultTokenModel.set("tok_chk_d_dom_health_cls","chk_dm_health_ok")
				}
			});
		}
	});
	base_dom_lkp_b_check_srch.on('search:done', function(properties) {
		var dom_lkp_b_lim = 1
		if (properties.content.resultCount > 0) {
    		var dom_lkp_b_results = base_dom_lkp_b_check_srch.data("results");
    		dom_lkp_b_results.on("data", function() {
				if(dom_lkp_b_lim<2){		
					dom_lkp_b_lim = dom_lkp_b_lim +1	
					$(".run_spin_dom_chk").addClass("hidden")
					defaultTokenModel.set("tok_chk_d_dom_health_lbl","OK: AD_Obj_Domain Lookup Contains Data.")
					defaultTokenModel.set("tok_chk_d_dom_health_cls","chk_dm_health_ok")
				}
			});
		}
	});
	base_dom_lkp_c_check_srch.on('search:done', function(properties) {
		var dom_lkp_c_lim = 1
		if (properties.content.resultCount > 0) {
    		var dom_lkp_c_results = base_dom_lkp_c_check_srch.data("results");
    		dom_lkp_c_results.on("data", function() {
				if(dom_lkp_c_lim<2){		
					dom_lkp_c_lim = dom_lkp_c_lim +1	
					$(".run_spin_dom_chk").addClass("hidden")
					defaultTokenModel.set("tok_chk_d_dom_health_lbl","OK: AD_Obj_Domain Lookup Contains Data.")
					defaultTokenModel.set("tok_chk_d_dom_health_cls","chk_dm_health_ok")
				}
			});
		}
	});
	base_dom_lkp_d_check_srch.on('search:done', function(properties) {
		$(".run_spin_dom_chk").addClass("hidden")
		var dom_lkp_d_lim = 1
		if (properties.content.resultCount > 0) {
			var dom_lkp_d_results = base_dom_lkp_d_check_srch.data("results");
			dom_lkp_d_results.on("data", function() {
				if(dom_lkp_d_lim<2){		
					dom_lkp_d_lim = dom_lkp_d_lim +1
					defaultTokenModel.set("tok_chk_d_dom_health_lbl","OK: AD_Obj_Domain Lookup Contains Data.")
					defaultTokenModel.set("tok_chk_d_dom_health_cls","chk_dm_health_ok")
				}
			});
		}
	});
	sub_mac_chk_res.on('search:progress', function(properties) {
		// Print just the event count from the search job
		$(".run_spin_mac_chk").removeClass("hidden")
	});
	sub_mac_chk_res.on('search:done', function(m_properties) {
        var mac_chk_srch_lim=1
		$(".run_spin_mac_chk").addClass("hidden")
		if (m_properties.content.resultCount > 0) {
    		var sub_mac_chk_results = sub_mac_chk_res.data("results");
    		sub_mac_chk_results.on("data", function() {
				if(mac_chk_srch_lim<2){
					var tbl_mac_chk_vals = sub_mac_chk_results.data().rows;
					mac_chk_srch_lim = mac_chk_srch_lim + 1
					var mac_all_st = tbl_mac_chk_vals[0][0]
					var mac_all_msg = tbl_mac_chk_vals[0][1]
                    var mac_all_tbl = tbl_mac_chk_vals[0][2]
					var mac_nts = tbl_mac_chk_vals[0][3]
					if(mac_all_st!="a_idxs_o"){
						$(".mac_chk_summary").addClass("idxs_mac_warn")
						$(".mac_chk_summary i").removeClass("ms_obj_icon_info").addClass("ms_obj_icon_critical")
						$(".hdr_p_steps_core.p_task_crt_idx").removeClass("a_idxs_o")
					} else {
						$(".mac_chk_summary i").removeClass("ms_obj_icon_critical").addClass("ms_obj_icon_info")
						$(".mac_chk_summary").removeClass("idxs_mac_warn")
						$(".hdr_p_steps_core.p_task_crt_idx").addClass("a_idxs_o")
					}
					$(".mac_chk_h_tbl").html(mac_all_tbl)
					$(".mac_chk_all_msg").html(mac_all_msg)
					$(".mac_chk_nt_list").html(mac_nts)
				}
			});
		}
	});
	function upd_trigger_tok(t_tok,t_tok_type){
		if(t_tok_type==="t"){
			var tgt_tok_vals = t_tok.split(",")
			for (i=0;i<tgt_tok_vals.length;i++)
				{
					var m_tgt_tok = tgt_tok_vals[i]
					var m_cur_tok_val = defaultTokenModel.get(m_tgt_tok)
					if(m_cur_tok_val === undefined){
						m_cur_tok_val = 0
					}
					var m_new_val_nmb = Number(m_cur_tok_val)+4;
					defaultTokenModel.set(m_tgt_tok,m_new_val_nmb)
					submitTokenModel.set(m_tgt_tok,m_new_val_nmb)
				}
		} else {
			var cur_tok_val = defaultTokenModel.get(t_tok)
			if(cur_tok_val === undefined){
				cur_tok_val = 0
			}
			var new_val_nmb = Number(cur_tok_val)+4;
			defaultTokenModel.set(t_tok,new_val_nmb)
			submitTokenModel.set(t_tok,new_val_nmb)
		}
	}
	$(document).on("click","[data-rerun-srch],[data-rerun-multi]", function() {
		var tgt_tok=$(this).data('rerun-srch');
		var tgt_tok_multi=$(this).data('rerun-multi');
		upd_trigger_tok(tgt_tok,tgt_tok_multi)
	});

	defaultTokenModel.on("change:tok_chk_d_res_admon", function(model, tok_chk_d_res_admon, options) {
		var a_sync_chk=defaultTokenModel.get("tok_chk_d_res_admon");
		var dom_lkp_chk=defaultTokenModel.get("tok_chk_d_dom_lkp_cls");
		if(a_sync_chk==="chk_d_res_admon_y" || dom_lkp_chk==="chk_dm_lkp_missing"){
			defaultTokenModel.set("tok_show_domain_warn","true")
		} else {
			defaultTokenModel.unset("tok_show_domain_warn")
		}
	});
	defaultTokenModel.on("change:tok_chk_d_dom_lkp_cls", function(model, tok_chk_d_dom_lkp_cls, options) {
		var a_sync_chk=defaultTokenModel.get("tok_chk_d_res_admon");
		var dom_lkp_chk=defaultTokenModel.get("tok_chk_d_dom_lkp_cls");
		if(a_sync_chk==="chk_d_res_admon_y" || dom_lkp_chk==="chk_dm_lkp_missing"){
			defaultTokenModel.set("tok_show_domain_warn","true")
		} else {
			defaultTokenModel.unset("tok_show_domain_warn")
		}
	});
});