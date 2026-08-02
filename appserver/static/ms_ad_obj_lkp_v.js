require(["jquery", 
        "splunkjs/mvc",
        "splunkjs/mvc/simplexml/ready!"], 
    function($, mvc) {
        var defaultTokenModel = mvc.Components.get("default");
        var submitTokenModel = mvc.Components.get("submitted");
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
        defaultTokenModel.on("change:tok_filt_type", function(model, tok_filt_type, options) {
            var f_type=defaultTokenModel.get("tok_filt_type");
            if(f_type==="by_fld"){
                $("#input_obj_filt,#input_obj_list,#input_obj_byp").addClass("hidden");
                setToken("tok_trg_check",undefined)
                setToken("tok_srch_trg_bs_fld",undefined)
                setToken("tok_srch_fmt_fld_cnt",undefined)
                setToken("tok_srch_trg_filt_fld_val",undefined)
                setToken("tok_tgr_sub_obj_list",undefined)
                setToken("form.inp_obj_filt",undefined)
                setToken("inp_obj_filt",undefined)
                setToken("form.inp_fld_filt",undefined)
                setToken("inp_fld_filt",undefined)
                setToken("form.inp_tok_obj","sel")
                setToken("inp_tok_obj","sel")
                setToken("tok_sel_obj",undefined)
                setToken("tok_sel_obj_lbl",undefined)
                setToken("tokshowfldfilt",undefined)
                setToken("tokshowfldbyp",undefined)
                setToken("tokshowfldvallist",undefined)
                setToken("tokshowobjfilt",undefined)
                setToken("tokshowobjlist",undefined)
                setToken("tokshowobjbyp",undefined)
                setToken("tokshowresobj",undefined)
                setToken("tokshowtabs",undefined)
                setToken("tok_sel_fld_lbl",undefined)
                setToken("tok_bypass_obj",undefined)
                setToken("tok_bypass_fld",undefined)
                setToken("tokshowresseltbl",undefined)
                setToken("tokshowresselmsg","True")
                setToken("tokshowresdettbl",undefined)
                setToken("tokshowresdetmsg","True")
                setToken("tokshowresfld","True")
                setToken("form.inp_tok_sel_fld","sel")
                setToken("inp_tok_sel_fld","sel")
                setToken("tok_message_color","green")
                setToken("tok_message_state","3.")
                setToken("tok_message","Select the Lookup Field to use for the Filter.")
                setToken("tok_obj_filt_lbl","")
                setToken("tok_obj_list_msg","")
                setToken("tok_obj_list_label_msg","")
                setToken("tokshowfldlist","yes")
                setToken("tok_tab_1_label","Base Object List (Pending)")
                setToken("tok_obj_type_lbl","")
                $("#input_obj_filt,#input_obj_list,#input_obj_byp,#input_fld_filt,#input_fld_val_list,#input_fld_byp").addClass("hidden");
                $("#input_fld_list").removeClass("hidden");
            } else {                
                setToken("tok_trg_check",undefined)
                setToken("tok_srch_trg_bs_fld",undefined)
                setToken("tok_srch_fmt_fld_cnt",undefined)
                setToken("tok_srch_trg_filt_fld_val",undefined)
                setToken("tok_tgr_sub_obj_list",undefined)
                setToken("form.inp_obj_filt",undefined)
                setToken("inp_obj_filt",undefined)
                setToken("form.inp_tok_obj","sel")
                setToken("inp_tok_obj","sel")
                setToken("tok_sel_obj",undefined)
                setToken("tok_sel_obj_lbl",undefined)
                setToken("tokshowresfld",undefined)
                setToken("tokshowfldlist",undefined)
                setToken("tokshowfldvallist",undefined)
                setToken("tokshowfldfilt",undefined)
                setToken("tokshowfldlistbyp",undefined)
                setToken("tokshowobjlist",undefined)
                setToken("tok_bypass_obj",undefined)
                setToken("tokshowobjbyp",undefined)
                setToken("tokshowtabs",undefined)
                setToken("tokshowresseltbl",undefined)
                setToken("tokshowresselmsg","True")
                setToken("tokshowresdettbl",undefined)
                setToken("tokshowresdetmsg","True")
                setToken("tokshowresobj","True")
                setToken("tokshowobjfilt","True")
                setToken("tok_sel_srch_filt_fld","")
                setToken("tok_obj_filter_nmb","3")
                setToken("tok_obj_bypass_nmb","4")
                setToken("tok_obj_type_lbl","User")
                setToken("tok_obj_filt_lbl","Enter a Filter for the Object's cn,sAMAccountName,dNSHostName or userPrincipal Name.")
                setToken("tok_obj_list_msg","Enter a Filter for the Object's cn,sAMAccountName,dNSHostName or userPrincipal Name.")
                setToken("tok_obj_list_label_msg","Enter a Filter for the User's cn,sAMAccountName,dNSHostName or userPrincipal Name.")
                setToken("tok_obj_list_msg_color","green")
                setToken("tok_message_color","green")
                setToken("tok_message_state","3.")
                setToken("tok_message"," Enter a Filter for the Object's cn,sAMAccountName,dNSHostName or userPrincipal Name. Use a * for a wildcard.")
                setToken("tok_tab_1_label","Base Object List (Pending)")
                setToken("tok_obj_type_fld_lbl","")
                $("#input_fld_filt,#input_fld_list,#input_fld_val_list,#input_fld_byp").addClass("hidden");
                $("#input_obj_filt").removeClass("hidden");
            }
        });
    });