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
    SearchManager
) { 
    var defaultTokens = mvc.Components.get('default');
    var submittedTokens = mvc.Components.get('submitted');
    
        $("[id^=upd_dm_host]")
        .find("input")
        .on("change", function() {
            if($(this).val()===""){
                defaultTokens.unset("tok_upd_dm_host")
                $(this).css("border-color", "#f99d1c");
                $("[id^=upd_dm_host]").removeClass('di_completed');      
            } else {
                $(this).css("border-color", "#40A540");
                $("[id^=upd_dm_host]").find("label").addClass('di_completed');
            }
            check_d_btn()
        })      
        $("[id^=upd_dm_forest]")
        .find("input")
        .on("change", function() {
            if($(this).val()===""){
                defaultTokens.unset("tok_upd_dm_forest")
                $(this).css("border-color", "#f99d1c");
                $("[id^=upd_dm_forest]").find("label").removeClass('di_completed');      
            } else {
                $(this).css("border-color", "#40A540");
                $("[id^=upd_dm_forest]").find("label").addClass('di_completed');
            }
            check_d_btn()
        })  
        $("[id^=upd_dm_site]")
        .find("input")
        .on("change", function() {
            if($(this).val()===""){
                defaultTokens.unset("tok_upd_dm_site")
                $(this).css("border-color", "#f99d1c");
                $("[id^=upd_dm_site]").find("label").removeClass('di_completed');      
            } else {
                $(this).css("border-color", "#40A540");
                $("[id^=upd_dm_site]").find("label").addClass('di_completed');
            }
            check_d_btn()
        })   
        $("[id^=upd_dm_dns]")
        .find("input")
        .on("change", function() {
            if($(this).val()===""){
                defaultTokens.unset("tok_upd_dm_dns")
                $(this).css("border-color", "#f99d1c");
                $("[id^=upd_dm_dns]").find("label").removeClass('di_completed');      
            } else {
                $(this).css("border-color", "#40A540");
                $("[id^=upd_dm_dns]").find("label").addClass('di_completed');
            }
            check_d_btn()
        })    
        $("[id^=upd_dm_netbios]")
        .find("input")
        .on("change", function() {
            if($(this).val()===""){
                defaultTokens.unset("tok_upd_dm_netbios")
                $(this).css("border-color", "#f99d1c");
                $("[id^=upd_dm_netbios]").find("label").removeClass('di_completed');      
            } else {
                $(this).css("border-color", "#40A540");
                $("[id^=upd_dm_netbios]").find("label").addClass('di_completed');
            }
            check_d_btn()
        })                           
    function check_d_btn(){
        var d_host=$("[id^=upd_dm_host]").find("input").val();
        var d_dns=$("[id^=upd_dm_dns]").find("input").val();  
        var d_netbios=$("[id^=upd_dm_netbios]").find("input").val();  
        var d_forest=$("[id^=upd_dm_forest]").find("input").val(); 
        var d_site=$("[id^=upd_dm_site]").find("input").val();
        if (d_host==="" || d_dns==="" || d_netbios==="" || d_forest==="" || d_site==="" ) {
            $('#btn_upd_domaina').attr("aria-disabled","true");
            defaultTokens.set("tok_dm_btn", "true")
        } else {
            $('#btn_upd_domaina').attr("aria-disabled","false");
            defaultTokens.set("tok_dm_btn", "false")
        }
    }
    check_d_btn()
});