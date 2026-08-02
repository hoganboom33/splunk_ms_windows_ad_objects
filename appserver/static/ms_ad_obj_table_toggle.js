require([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/postprocessmanager',
    'splunkjs/mvc/dropdownview', 
    'splunkjs/mvc/textinputview',   
    'splunkjs/mvc/simplexml/ready!'
], function(_, $, mvc, TableView, SearchManager,PostProcessManager,DropdownView,TextInputView) {
    // Set up Arrays for Selection Changes
    var uc_data_enable_array = [];
    var uc_data_disable_array = [];  
    // Set and Get Tokens  
    var defaultTokenModel = mvc.Components.get('default');
    var submittedTokenModel = mvc.Components.get('submitted');
    var envTokenModel = mvc.Components.get('env');
    const val_user_id=envTokenModel.get('user');
    // ----  Search Managers --- //
    // Main UC Data Lookup Search
    var sm_uc_data_base = new SearchManager({
        id: "sm_uc_data_base",
        search: '|inputlookup vj_cfg_uc_data_cat WHERE user=\"'+val_user_id+'\"| eval Status=if(state=="0","dis","ena")."".id  | makemv delim="," use_cases| table id, Status, description, use_cases, type',
        earliest_time: "-1h@h",
        latest_time: "now",
        preview: true,
        cache: true
    });
    // ----  Post Search Managers --- //
    // Table Search - Get UC Data Sub List - for Showing Results
    var sm_uc_data_sub_display = new PostProcessManager({
        id: "sm_uc_data_display",
        managerid: "sm_uc_data_base",
        search: "rename description AS Description, type AS Category, use_cases AS Use-Cases  | table Status, Category, Use-Cases, Description"
    });
    
    // ----  Table Views --- //
    // Create a UC Data Table View
    var tbl_uc_data_view = new TableView({
        id: "tbl_uc_data_view_id",
        managerid: "sm_uc_data_display",
        fields: "Status, Category, Use-Cases, Description",
        wrap: true, 
        el: $("#tbl_uc_data_view_id")
    }).render();    
    // ----  Functions --- //    
    // Function for Updating Selection Array
    function updateucdatasCollection (uc_data, typevl) {
        if (typevl === "Add") {
            if (uc_data_enable_array.indexOf(uc_data) === -1) {
                uc_data_enable_array.push(uc_data);
            }
        } else {
            var i = uc_data_enable_array.indexOf(uc_data);
            if(i != -1) {
                uc_data_enable_array.splice(i, 1);
                uc_data_disable_array.push(uc_data);
            } 
        }
    }  

    // Action - onClick - Bypass default drilldown behavior for Selections
    tbl_uc_data_view.on("click", function(e) {
        e.preventDefault();
    });

    // ----  Render Actions --- //
    // Render Cell Value - Toggle Selection Switch
    var CustomCellRenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cellData) {
            // This method returns "true" for the "Status" field
            return cellData.field === "Status";
        },

        // This render function only works when canRender returns "true"
        render: function($td, cellData) {
            var sel_int = cellData.value.substr(0,3);
            var idvl = cellData.value.substr(3,50);
            var i = uc_data_enable_array.indexOf(idvl);
            if(i != -1) {
                sel_int = "ena";
            } 
            var k = uc_data_disable_array.indexOf(idvl);
            if(k != -1) {
                sel_int = "dis";
            }                         
            var $toggleAction = $('<input name="uc_data_' + idvl + '" data-toggle="toggle" data-onstyle="success" data-offstyle="danger" type="checkbox"><div class="toggle-group"><label class="btn btn-success toggle-on"><b>Yes</b></label><label class="btn btn-danger active toggle-off">No</label><span class="toggle-handle btn btn-default"></span></div>');
            if(sel_int === 'ena') {
                    $toggleAction.prop("checked", true);
                    var selstr = 'checked="true"';
                    var selvl = 'success';
                    updateucdatasCollection(idvl, "Add");
                }
            else {
                    $toggleAction.prop("checked", false);
                    var selstr = 'checked="false"';
                    var selvl = 'danger off';
                    updateucdatasCollection(idvl, "Remove");
                }
            var a = $('<div>').attr({"id":"chk-uc-item-"+idvl,"name":"uc_data_"+idvl,"value":idvl,"data-toggle":"toggle","style":"width: 31.2333px; height: 16.7333px;"}).addClass('toggle btn btn-' + selvl).click(function() {
                if($(this).attr('class')==="toggle btn btn-success")
                {
                    $(this).removeClass();
                    $(this).addClass("toggle btn btn-danger off");
                    updateucdatasCollection($(this).attr('value'), "Remove");
                    $toggleAction.prop("checked", false);   
                  }
                else {
                    $(this).removeClass();
                    $(this).addClass("toggle btn btn-success");
                    updateucdatasCollection($(this).attr('value'), "Add");
                    $toggleAction.prop("checked", true);
                }
                defaultTokenModel.set("tok_uc_data_array", uc_data_enable_array.join());
                submittedTokenModel.set(defaultTokenModel.toJSON());
            }).append($toggleAction).appendTo($td);
        }
    });
    // ----  Execution Actions --- //
    // Render - Create an instance of the custom cell renderer,add it to the table, and render the table
    var myCellRenderer = new CustomCellRenderer();
    tbl_uc_data_view.addCellRenderer(myCellRenderer);   
    tbl_uc_data_view.render();     

    // Function - Capture Selections and update tok_uc_data_array token
       $(document).ready(function () { 
        $(".splunk-view splunk-paginator").on("click", function (e) {
            e.preventDefault();
            defaultTokenModel.set("tok_uc_data_array", uc_data_enable_array.join());
            submittedTokenModel.set(defaultTokenModel.toJSON());
        });
    });
});