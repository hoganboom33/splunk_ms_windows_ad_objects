require.config({
    paths: {
        "common": "../app/ms_windows_ad_objects/js/common",
        "ms_windows_ad_objects": "../app/ms_windows_ad_objects/js/ms_windows_ad_objects",
    },
});
require([
    'underscore',
    'jquery',
    'splunkjs/mvc/utils',
    'splunkjs/mvc',
    "splunkjs/mvc/utils",
    'ms_windows_ad_objects/components/ms_ad_obj_ldaprecordview',
  	"splunkjs/mvc/searchmanager",
    'splunkjs/mvc/simplexml/ready!'
], function(_, $, utils, mvc, utils, LDAPRecordView, SearchManager) {

    var report = new LDAPRecordView({
    	"id": "audit_report",
    	"managerid": "audit_query",
    	"el": $("#audit_report")
    }).render();
});