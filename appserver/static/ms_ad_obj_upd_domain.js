require([
    "jquery",
    "underscore",
    'backbone', 
    "splunkjs/mvc",
    "splunkjs/mvc/textinputview",
    "splunkjs/mvc/searchmanager",   
    "splunkjs/mvc/simplexml/ready!"  
], function(
    $,
    _,
    Backbone,
    mvc,
    TextInputView,
    SearchManager
) {
var defaultTokens = mvc.Components.get('default');
var submittedTokens = mvc.Components.get('submitted');
var cur_domain_base = new SearchManager({
    id: "cur_domain_list_srch",
    search: "|inputlookup AD_Obj_Domain |table host,domain,DomainDNSName,DomainNetBIOSName,Site,Forest",
    preview: true,
    cache: true,
    status_buckets: 300
}); 
var upd_user = []
var upd_domain_base = new SearchManager({
	id: "upd_domain_srch",
	search: "|makeresults| eval hold=\"hold for updating instance lookup\"",
	preview: true,
	cache: true,
	auto_start: false,
	status_buckets: 300
});
var val_inp_dns_name = new TextInputView({
    id:"inp_dom_dns_name_id",
    default: "",
    value: mvc.tokenSafe("$tok_dom_dns_name$"),
    el: $("#inp_dom_dns_name")
}).render();

var val_inp_netbios_name = new TextInputView({
    id:"inp_dom_netbios_name_id",
    default: "",
    value: mvc.tokenSafe("$tok_dom_netbios_name$"),
    el: $("#inp_dom_netbios_name")
}).render();

var val_inp_forest = new TextInputView({
    id:"inp_dom_forest_id",
    default: "",
    value: mvc.tokenSafe("$tok_dom_forest$"),
    el: $("#inp_dom_forest")
}).render();

var val_inp_site = new TextInputView({
    id:"inp_dom_site_id",
    default: "",
    value: mvc.tokenSafe("$tok_dom_site$"),
    el: $("#inp_dom_site")
}).render();

    // ## Function to Check if inputs have been entered before enabling action buttons  
    function check_d_btn(){
        var d_host=val_inp_host.settings.get("value");
        var d_dns=val_inp_dns_name.settings.get("value");  
        var d_netbios=val_inp_netbios_name.settings.get("value");  
        var d_forest=val_inp_forest.settings.get("value"); 
        var d_site=val_inp_site.settings.get("value");
        if (d_host==="" || d_dns==="" || d_netbios==="" || d_forest==="" || d_site==="" ) {
            $('#btn_add_domain').attr("aria-disabled","true");           
        } else {
            $('#btn_add_domain').attr("aria-disabled","false");
        }
    }
// ## Functions to clear the input values after Owner or User Account Creations.
    function clear_d_inputs() {
        $('#btn_add_domain').attr("aria-disabled","true");
        val_inp_host.settings.set("value", "");
        val_inp_dns_name.settings.set("value", "");
        val_inp_netbios_name.settings.set("value", "");
        val_inp_forest.settings.set("value", "");        
        val_inp_site.settings.set("value", "");
        setToken("tok_create_lk_upd_target",undefined,true);
        setToken("button_add_domain",undefined,true);
        upd_domain=[]
    };

    function d_upd_domain_srch (d_n_dom_details) {
        var lkp_running=true;
        var limit=2;
        var lkp_current=0;
        var base_upd_dom_srch="| makeresults" +
        "| eval host=\""+ d_n_dom_details.d_host + "\"" +
        "| eval DomainDNSName=\""+ d_n_dom_details.d_dns_name + "\"" +
        "| eval DomainNetBiosName=\""+ d_n_dom_details.d_netbios_name + "\"" +
        "| eval forest=\""+ d_n_dom_details.d_forest + "\"" +
        "| eval site=\""+ d_n_dom_details.d_site + "\"" +
        "| eval domain=\""+ d_n_dom_details.d_domain + "\"" +
        "| eval multi_lkps_enabled=\"f\",kv_suffix=\""+ d_n_dom_details.d_netbios_name + "\",dc_val=\""+ d_n_dom_details.d_dns_name + "\",user_lookup=\"AD_Obj_User\",group_lookup=\"AD_Obj_Group\",computer_lookup=\"AD_Obj_Computer\"" +
        "| eval key=\""+ d_n_dom_details.d_host + "\""
        var action_upd_dom_srch = base_upd_dom_srch +
        "| outputlookup AD_Obj_Domain key_field=key append=true"
        
        var submittedTokens = mvc.Components.get('submitted');
        var update_d_table = submittedTokens.get('tok_upd_d_table')
     	update_d_table++; 	        
        upd_domain_base.cancel();
        upd_domain_base.settings.unset("search");
        upd_domain_base.settings.set("search", action_upd_dom_srch);
        upd_domain_base.startSearch();
        upd_domain_base.on('search:done', function(a_properties) {
            lkp_current=lkp_current+1;
            var a_searchName = a_properties.content.request.label
            if(lkp_running){
                if (a_properties.content.resultCount == 0) {
                    lkp_running=false;
                } else {
                	clear_d_inputs
                    submittedTokens.set('tok_upd_d_table', update_d_table);
                    lkp_running=false;
                }
            } else {
                return false;
            }            
        });
    };       
// ## Account Creation Actions from Create Owner and Create User buttons
//var splunkWebHttp = new splunkjs.SplunkWebHttp();
//var service = new splunkjs.Service(splunkWebHttp);
	$('.add_new_domain').on('click', function(e) {
		e.preventDefault();
		var d_value_array = {
			d_host: val_inp_host.settings.get("value"),
			d_dns_name: val_inp_dns_name.settings.get("value"),            
			d_netbios_name: val_inp_netbios_name.settings.get("value"),
			d_forest: val_inp_forest.settings.get("value"),
			d_site: val_inp_site.settings.get("value"),        
			d_domain: val_inp_netbios_name.settings.get("value")
		};
    	d_upd_domain_srch (d_value_array);
	});
}) 