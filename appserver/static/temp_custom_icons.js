 require([
       'underscore',
       'jquery',
       'splunkjs/mvc',
       'splunkjs/mvc/tableview',
       'splunkjs/mvc/simplexml/ready!'
   ], function(_, $, mvc, TableView) {
     var status_array = [];   
     var CustomRangeRenderer = TableView.BaseCellRenderer.extend({
         canRender: function(cell) {
             //return cell.field;
             return cell.field === "Status";
         },
         render: function($td, cell) {
			// Requires the Status column to contain an string array with "Icon Class", "Status Label", "Status Color", in that order and with a comma seperator:
			// example ("icon-check-circle,OK,green")
			// NOTE: You can also use hex colors like #49B849 for the Status Color
            status_array = cell.value.split(",");
            var status_icon = status_array[0]
            var status_name = status_array[1]
            var status_color = status_array[2]
			$td.html("<div class='status_div_cls' style='text-align:center !imporant;'><i class='"+status_icon+" status_icon_cls' style='text-align:center !imporant;color:"+status_color+" !important;' /><b class='status_name_cls' style='color:"+status_color+" !important;'> ("+status_name+")</b></div>")
         }
     });
	 $(document).ready(function () {
		 var defaultTokenModel = mvc.Components.get('default');
		 defaultTokenModel.on("change:refresh_table", function(e) {
			var sh = mvc.Components.get("sample");
			if(typeof(sh)!="undefined") {
				sh.getVisualization(function(tableView) {
					 // Add custom cell renderer and force re-render
					 tableView.table.addCellRenderer(new CustomRangeRenderer());
					 tableView.table.render();
				 });
			 }
		});
	});		
});