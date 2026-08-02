define([
    'underscore',
    'backbone',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/simplexml/element/table'
    ], function(_, Backbone, $, mvc, TableElement) {
        var ms_ad_obj_modal_template = "<div id=\"pivotModal\" class=\"modal prev_ms_ad_obj_modal\">" +
    "<div class=\"modal-header\"><h3 style=\"text-align:center;margin-bottom:0px !important;margin-top:0px !important;padding-bottom:2px !important;padding-top:0px !important;\"><i class=\"icon-mail\" style=\"height:20px;padding-right:3px;\"/><%- title %></h3><button class=\"close\">Close</button>" + 
    "</div><h4 style=\"text-align:center;\"><center><div id=\"prev_ms_ad_obj_modal_hdr_box\" style=\"text-align:center;width:95%;background-color: #F2F4F5;border: 3px solid #49B849;padding: 2px;margin: 2px;\">" +
    "<div id=\"prev_ms_ad_obj_modal_hdr_subject\" style=\"text-align:left;width:90%:background-color: #F2F4F5;border: 1px solid black;padding-left: 5px;margin: 2px;\"><b>Subject:</b>  <%- prev_ms_ad_obj_modal_subject %></div></div></center></h4>" +
    "<div class=\"modal-body\"><h4 style=\"text-align:left;margin-bottom:0px !important;margin-top:0px !important;padding-bottom:2px !important;padding-top:0px !important;\"><b><i>Message Content:</i></b></h4><div class=\"prev_ms_ad_obj_modal_msg_table\"></div></div>" +
    "<div class=\"modal-footer\">" +
    "<center><button class=\"btn btn-primary close\"><i class=\"icon-x-circle\" style=\"height:15px;padding-right:3px;\"/>Close</button></center>" +
    "</div>" +
    "</div>" +
    "<div class=\"modal-backdrop\"></div>";
    var ms_ad_obj_modal_template_o = "<div id=\"pivotModal\" class=\"modal prev_ms_ad_obj_modal\">" +
    "<%- t_inner_html %>" +
    "</div>" +
    "<div class=\"modal-backdrop\"></div>";
    var submittedTokens = mvc.Components.get('submitted');
    var defaultTokens = mvc.Components.get('default');
    var url_em_body_msg= ""
        var ms_ad_obj_modal_preview = Backbone.View.extend({
            defaults: {
        	   title: 'Not set'
            },
            initialize: function(options) {
                this.options = options;
                this.options = _.extend({}, this.defaults, this.options);
                this.childViews = [];              
                this.template = _.template(ms_ad_obj_modal_template_o);
            },          
            events: {
        	   'click .close': 'close',
        	   'click .close_btn': 'close',        	   
               'click .modal-backdrop': 'close'
            },
            render: function() {
                var data = { title : this.options.t_title,t_inner_html : this.options.t_inner_p_html};
                var msg_p="<div id=\"" + this.options.t_title + "_modal\" class=\"modal prev_ms_ad_obj_modal\">" + this.options.t_inner_p_html + "</div><div class=\"modal-backdrop\"></div>"   
        	    this.$el.html(msg_p);
                return this;
            }, 
            show: function() {
        	    $(document.body).append(this.render().el);
                   //width:'80%',
                $(this.el).find('.prev_ms_ad_obj_modal').css({
                    'max-width': '90%',
                    width:'70%',
                    height:'auto',
                    left: '15%',
                    'margin-left': '0',
                    'max-height':'90%',
                    overflow: 'none'
                });
            },
            close: function() {
        	   this.unbind();
               this.remove();
               _.each(this.childViews, function(childView) {
                   childView.unbind();
                   childView.remove();                  
               });
            }
        });  
        return ms_ad_obj_modal_preview;
});