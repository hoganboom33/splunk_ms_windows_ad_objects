require([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/simplexml/ready!'
], function(_, $, mvc, TableView) {

    var CustomRangeRenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cell) {
            // Enable this custom cell renderer for Person field
            return _(["View Steps"]).contains(cell.field);
        },
        render: function($td, cell) {
            // Add a class to the cell based on the returned value
            var strCellValue = cell.value;

            if (cell.field === "View Steps") {
                var strObjType = strCellValue.substr(0, 4);
                //var strHtmlInput="<input type='button' class='table-button btn-primary' value='"+strCellValue+"'></input>";
                var strHtmlInput='<a href="#" class="btn btn-mini view_steps" data-obj-step-type="'+strObjType+'" data-obj-step-id="'+strCellValue+'" data-token-json="{&quot;tok_step_'+strObjType+'_link&quot;:&quot;'+strCellValue+'&quot;,&quot;tok_rev_stat_'+strCellValue+'&quot;:&quot;reviewed&quot;}" style="width:100% !important;"> View Steps</a>'
                //Add TextBox With Specific Style
               $td.append(strHtmlInput);
            }
        }
    });

    mvc.Components.get('tbl_btn_dd_prep').getVisualization(function(tableView) {
        // Add custom cell renderer, the table will re-render automatically.
        tableView.addCellRenderer(new CustomRangeRenderer());
    });
    mvc.Components.get('tbl_btn_dd_depl').getVisualization(function(tableView) {
        // Add custom cell renderer, the table will re-render automatically.
        tableView.addCellRenderer(new CustomRangeRenderer());
    });
    mvc.Components.get('tbl_btn_dd_compl').getVisualization(function(tableView) {
        // Add custom cell renderer, the table will re-render automatically. = "-string"
        tableView.addCellRenderer(new CustomRangeRenderer());
    });
        $('.dashboard-body').on('click', '[data-obj-step-type],[data-obj-step-id]', function(ms_ad_obj_step_stat) { 
            var target = $(ms_ad_obj_step_stat.currentTarget);
            var step_t = target.data('obj-step-type') + "_step_details";
            var step_id = target.data('obj-step-id');
            let step_t_cls = '[^id=' + step_t + ']';
            let step_id_cls = '#' + step_id;
            $( "[id^=" + step_t + "]").hide();
            $( "#" + step_id ).show();
            target.addClass("reviewed")
            
        }) 
});