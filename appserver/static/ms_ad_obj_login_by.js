require([
	"jquery",
    "splunkjs/mvc",
    "splunkjs/mvc/searchmanager",
    "splunkjs/mvc/postprocessmanager",
    "splunkjs/mvc/simplexml/ready!"
], function($,mvc,SearchManager,PostProcessManager) {
    var defaultTokenModel = mvc.Components.get("default");
    var submitTokenModel = mvc.Components.get("submitted");
 
    var base_domain_search_val = new SearchManager({
        id: "base_domain_search",
        search: "| `ms_obj_domain_list`",
        earliest_time: "-24h@h",
        latest_time: "now",
        preview: true,
        cache: true,
        status_buckets: 300
    });    
    base_domain_search_val.on('search:progress', function(properties) {
        var srch_dr_cnt = properties.content.resultCount
        if(srch_dr_cnt==0){
            defaultTokenModel.set("ts_srch_domain","`ms__obj_win_ad_index` eventtype=\"ms_ad_obj_msad-dc-health\"");
            defaultTokenModel.set("ts_bld_domain","`ms_obj_admon_bld_domain`");
			$("#row_msgs").addClass("active")
			$("#msg_prg_init_nodomain").addClass("active")
            $("#rw_inputs").removeClass("active")
		} else {
			$("#rw_inputs").addClass("active")
		}
    }); 
    var base_obj_search_val = new SearchManager({
        id: "base_obj_search",
        search: "$tok_srch_ad_group_list$",
        earliest_time: "-24h@h",
        latest_time: "now",
        preview: true,
        cache: true,
        status_buckets: 300
    }, {tokens: true});    
    base_obj_search_val.on('search:progress', function(properties) {
        var srch_g_cnt = properties.content.resultCount
        $("#row_tabs").removeClass("active")
        $("[id^=row_d]").removeClass("active")
        $("#rw_initial_panel").removeClass("split")
        $("#rw_initial_post_panel").removeClass("active")
        $("#row_msgs").removeClass("active")
        if(srch_g_cnt>0){
            $("#input_obj_list_id").addClass("active")
		}
    });
    base_obj_search_val.on('search:done', function(properties) {
        var srch_gd_cnt = properties.content.resultCount
        if(srch_gd_cnt===0){
            $("#input_obj_list_id").removeClass("active")
        	$("#row_msgs").addClass("active")
			$(".msg_obj_warn").addClass("active")
		} else {
            $("#input_obj_list_id").addClass("active")
        }
    });
    var base_obj_m_search_val = new SearchManager({
        id: "base_obj_m_search",
        search: "$tok_srch_ad_user_list$",
        earliest_time: "-24h@h",
        latest_time: "now",
        preview: true,
        cache: true,
        status_buckets: 300
    }, {tokens: true});
    base_obj_m_search_val.on('search:progress', function(properties) {
        $("row_tabs").removeClass("active")
        $(".prg_run_state").addClass("active")
        $("#prg_run_state_msg").html("(Search Running)")
    });
    base_obj_m_search_val.on('search:done', function(properties) {
        //document.getElementById("prg_run_state_msg").innerHTML="";
        var srch_r_cnt = properties.content.resultCount
        var srch_r_cnt_str = String(srch_r_cnt);
        defaultTokenModel.set("tok_group_m_count",srch_r_cnt);
        if(srch_r_cnt==0){
			$(".show_filt_btn").removeClass("active")
			$(".hide_filt_btn").removeClass("active")
			$(".msg_prg_run_nodata").removeClass("active")
            $("#row_msgs").addClass("active")
			$(".msg_obj_m_warn").addClass("active")
            defaultTokenModel.set("ex_s_trigger",undefined);
			submitTokenModel.set("ex_s_trigger",undefined);
		} else {
			var base_obj_m_search_res = base_obj_m_search_val.data("results");
			defaultTokenModel.set("tok_g_m_count",srch_r_cnt_str);
			base_obj_m_search_res.on("data", function() {
                $("#row_msgs").removeClass("active")
				$(".msg_obj_m_warn").removeClass("active")
				defaultTokenModel.set("ex_s_trigger",srch_r_cnt_str);
				submitTokenModel.set("ex_s_trigger",srch_r_cnt_str);
			});
		}
    });
    var prg_logon_search_val = new SearchManager({
        id: "base_logon_search",
        search: "$tok_srch_logon$" +
        "| eval ex_search_trigger=\"$ex_s_trigger$\"",
        earliest_time: "$time_field.earliest$",
        latest_time: "$time_field.latest$",
        preview: true,
        cache: true,
        status_buckets: 300
    }, {tokens: true});

    prg_logon_search_val.on('search:cancelled', function(properties) {
        $("[id^=msg_]").removeClass("active")
    });
          
    prg_logon_search_val.on('search:failed', function(properties) {
        $(".prg_run_state").removeClass("active")
        $(".msg_prg_run_nodata").removeClass("active")
        $(".msg_prg_run_failed").addClass("active")
		$(".show_filt_btn").removeClass("active")
		$(".hide_filt_btn").removeClass("active")
    });

    prg_logon_search_val.on('search:progress', function(properties) {
		$(".prg_run_state").addClass("active")
        var srch_pe_cnt = String(properties.content.eventCount)
        if(srch_pe_cnt==undefined){
            srch_pe_cnt="0"
        }
        //document.getElementById("prg_run_state_msg").innerHTML="(Search Running " + srch_pe_cnt + " events...)";
        $("#prg_run_state_msg").html("(Search Running " + srch_pe_cnt + " events...)")
    	$("[id^=row_]").removeClass("active")
        $("[id^=tab_]").removeClass("active")
        $("[id^=msg_]").removeClass("active")
        $(".show_filt_btn").removeClass("active")
        $(".hide_filt_btn").removeClass("active")
    });

    prg_logon_search_val.on('search:done', function(properties) {
        $(".prg_run_state").removeClass("active")
        var srch_e_cnt = properties.content.eventCount
        var srch_e_cnt_str = String(srch_e_cnt)
        defaultTokenModel.set("tok_result_count",srch_e_cnt_str);
        if(srch_e_cnt==0){
            $("#row_msgs").addClass("active")
            $("[id^=row_d_results]").removeClass("active")
            $("[id^=tab_li_]").removeClass("active")
            $("#row_tabs").removeClass("active")
            $("#row_d_members").addClass("active")
            $("#tbl_members").removeClass("mddominpsettoptbl")
            $("#tbl_members").addClass("mdwarninpsettoptbl")
            $(".msg_prg_run_nodata").addClass("active")
            $("#rw_initial_panel").removeClass("split")
            $("#rw_initial_post_panel").removeClass("active")
		} else {
            $("#rw_initial_panel").addClass("split")
            $("#rw_initial_post_panel").addClass("active")
            $("#row_tabs").addClass("active")
            $("#rw_show_filt_btn").addClass("active")
            $(".hide_filt_btn").addClass("active")
            $("#row_d_results_a").addClass("active")
            $(".tb_res_def").addClass("active")
            $("#tbl_members").removeClass("mdwarninpsettoptbl")
            $("#tbl_members").addClass("mddominpsettoptbl")
		}
    });
	$(document).on("click","[data-tab-tgt]", function(e) {
        e.preventDefault();
		$("[id^=tab_li_]").removeClass("active")
		$("[id^=row_d_]").removeClass("active")
		var tab_tgt=$(this).data('tab-tgt');
		var tab_li="#tab_li_"+tab_tgt;
		var tab_row="#row_d_"+tab_tgt;
		$(tab_li).addClass("active")
		$(tab_row).addClass("active");
    });
	$(document).on("click","[data-filt-btn-show],[data-filt-btn-hide],[data-filt-tgt]", function(e) {
        e.preventDefault();
		var obj_show=$(this).data('filt-btn-show');
		var obj_hide=$(this).data('filt-btn-hide');
		var obj_tgt="#"+$(this).data('filt-tgt');
        $(obj_show).addClass("active");
        $(obj_hide).removeClass("active");
        if(obj_show==".hide_filt_btn"){
            $(obj_tgt).addClass("active")
        } else {
            $(obj_tgt).removeClass("active")
        }
    });
    defaultTokenModel.on("change:tok_domain", function(e) {
        $("#input_obj_list_id").removeClass("active")
        $("#row_tabs").removeClass("active")
        $("[id^=row_d]").removeClass("active")
        $("#rw_initial_post_panel").removeClass("active")
        $("[id^=msgs_]").removeClass("active")
        defaultTokenModel.set("ex_s_trigger",undefined);
        submitTokenModel.set("ex_s_trigger",undefined);        
    });
});