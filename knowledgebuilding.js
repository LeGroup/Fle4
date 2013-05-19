/* Javascript magic */

(function($) {
	
	var cur_sort = "";
	var sort_order = -1;

	$(function() {
		/* Check whether KB is enabled; if not, do nothing */
		$('#knbu-type-selector').change(function (e) { GetKnbuInfo(e); });
		
		function GetKnbuInfo(e) {
			
			var url = $('#admin-ajax-url').val();
			var post_ID = $('#post-id').val();
			$.post(url, { 
				knbu_ID: $(e.target).val(),
				post_ID: post_ID,
				action: 'knbu_provide_knbu_info'
				}, 	function(response) { 
				
				response = JSON.parse(response);
				
				var form = $(e.target).closest('.knbu-form');
				
				var textarea = form.find('textarea[name="comment"]');
				if(textarea.val().length == 0 || textarea.val() == textarea.data('phrases')) {	
					textarea.val(response.phrases);
					textarea.data('phrases', response.phrases);
				}
				
				form.find('.knbu-checklist').hide(200, function() { $(this).html('<p>'+response.description + '</p><p>'+response.checklist+'</p>').show(200); });
				
			});
		}
		
		if ($("#knbu-exists").length == 0) { return; }
		
		
		
		
		$('.comment-reply-link').click(function(e) {
			e.preventDefault();
			var comment_body = $(this).closest('.comment-body');
			comment_body.attr('id').replace('div-comment-', '');
			
			$('#comment_parent').val(comment_body.attr('id').replace('div-comment-', ''));
			$('#respond').hide().insertAfter(comment_body).show(200);
		});


		 $("#comment_sorter li").click(function(e) {
			//e.preventDefault();
			var $target = $(e.target);
			var $list = $(".commentlist");
			var $coms = $list.find("li.comment");
			var coms = $coms.get();

			if($target.html() != 'as thread') {
			   $('.commentlist').removeClass('thread-sorted');
			}
			
			if ( cur_sort == $target.html() ) 
				sort_order = sort_order * -1; 
			else 
				sort_order = 1;
			
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
				if(!$('.commentlist').hasClass('thread-sorted'))
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
					return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
				});
				break;
				
				case 'by person': 
				coms.sort(function(a,b) {
					var ca = $(a).find(".comment-author cite.fn").text().toLowerCase();
					var cb = $(b).find(".comment-author cite.fn").text().toLowerCase();
					return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
				});
				break;
				
				case 'by knowledge type':
				coms.sort(function(a,b) {
					var ca = $(a).find(".kbtype-label span").html();
					var cb = $(b).find(".kbtype-label span").html();
					return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
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