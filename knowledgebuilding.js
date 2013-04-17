/* Javascript magic */

(function($) {
	var ktype_changed=false;
	var ktype_color="";
	var orig_comments="";
	var cur_sort="";
	var sort_order=1;

	function knbu_disable() {
	 $("#comment").fadeTo(0,0.33);
	 $("#comment")[0].disabled=true;
	 $("#submit")[0].disabled=true;
	}

	function knbu_enable() {
	 $("#comment")[0].disabled=false;
	 $("#comment").fadeTo("def",1.0).focus();
	 $("#submit")[0].disabled=false;
	}

	function scaffold_update(callback) {
	 var ktype = $("#knbu_real_ktype")[0].value;
	 var link = $(this);
	 $.post(".", {
	   knbu_ktype_info: ktype
	  }, function(data) {
	   if ( ktype_color ) {
		$("#knbu_heading,#knbu_popup_heading").removeClass(ktype_color);
	   }
	   $("#knbu_heading,#knbu_popup_heading").text(data.name).addClass(data.color);
	   ktype_color = data.color;
	   $("#knbu_checklist").html(data.checklist);
	   $("#knbu_popup_p").html(data.description);
	   $("#comment").text(data.phrases);
	   $("#comment").select();
	   if (callback) callback();
	  }, "json");
	}

	function scaffold_switch() {
	  $("#knbu_scaffold").fadeTo("slow",1.0);
	}

	function scaffold_open() {
	 $("#knbu_scaffold").slideDown("slow");
	}

	$(function() {
		 /* Check whether KB is enabled; if not, do nothing */
		 if ($("#knbu-exists").length == 0) { return; }

		 knbu_disable();

		 /* Move selector to correct place */
		 $("#comment").parent().prev().append($("#knbu"));
		 $("#knbu").show();

		 $("#knbu_select").click(function(e) {
		  e.preventDefault();
		  if ( ! $("#knbu_ktype")[0].value ) {
		   knbu_disable();
		   if ( ! ktype_changed )
			$("#knbu_ktype").fadeOut("fast").fadeIn("fast").fadeOut("fast").fadeIn("fast");
		  } else {
		   $("#knbu_real_ktype").val($("#knbu_ktype").val());
		   $("#knbu_ktype2").val($("#knbu_ktype").val());

		   scaffold_update(function() {
			 scaffold_open();
			 $("#knbu_init").slideUp("slow");
			 knbu_enable();
		   });
		  }
		 });
		 $("#knbu_select2").click(function(e) {
		  e.preventDefault();
		  $("#knbu_real_ktype").val($("#knbu_ktype2").val());
		  $("#knbu_scaffold").fadeTo("slow",0.1,function(){scaffold_update(scaffold_switch);});
		 });

		 $("#knbu_ktype").select(function(e) {
		  ktype_changed=true;
		 });

		 //orig_comments = $(".commentlist").clone(); 


		 $("#comment_sorter li").click(function(e) {
		   //e.preventDefault();
		   var $target = $(e.target);
		   var $list = $(".commentlist");
		   var $coms = $list.find("li.comment");
		   var coms = $coms.get();
		   
		   if($target.html() != 'as thread') {
			   $('.commentlist').removeClass('thread-sorted');
				if ( cur_sort = $target.html() ) 
					sort_order = sort_order * -1; 
				else 
					sort_order = 1;
			}
			
		   if($target.html() != 'as map') {
			   $('#map-frame').hide();
			   $('#comment-frame').show();
		   }
			switch($target.html()) {
				case 'as map':
				$('#map-frame').show();
				$('#comment-frame').hide();
				break;
				
				case 'as thread':
				$('.commentlist').addClass('thread-sorted');
				coms.sort(function(a,b) {
					var ca = parseInt($(a).attr('data-comment-index'));
					var cb = parseInt($(b).attr('data-comment-index'));
					return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
				});
				break;
				
				case 'by date':
				coms.sort(function(a,b) {
					var ca = $(a).find(".commentmetadata a:first-child").attr('data-stamp');
					var cb = $(b).find(".commentmetadata a:first-child").attr('data-stamp');
					return (ca < cb) ? -1*sort_order: (ca > cb) ? 1*sort_order : 0;
				});
				break;
				
				case 'by person': 
				coms.sort(function(a,b) {
					var ca = $(a).find(".comment-author cite.fn").text().toLowerCase();
					var cb = $(b).find(".comment-author cite.fn").text().toLowerCase();
					return (ca < cb) ? -1*sort_order: (ca > cb) ? 1*sort_order : 0;
				});
				break;
				
				case 'by knowledge type':
				coms.sort(function(a,b) {
					var ca = $(a).find(".kbtype-label").html();
					var cb = $(b).find(".kbtype-label").html();
					return (ca < cb) ? -1*sort_order: (ca > cb) ? 1*sort_order : 0;
				});
				break;
			}
		   $.each(coms,function(idx,itm) { $("#comment-frame").append(itm); });
		   

			 $("#comment_sorter li").css("font-weight","normal");
			 $target.css("font-weight","bold");
			 
			 
			 cur_sort=$target.html();
		   //console.timeEnd('total');
		 });

	});
	
})(jQuery);