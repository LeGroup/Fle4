/* Javascript magic */

(function($) {
	
	/* Add tiny expansion to the jQuery to add content match selector */
	$.expr[':'].contentIs = function(el, idx, meta) { return $(el).text() === meta[3]; };
	
	var cur_sort = "";
	var sort_order = -1;
	var threadTitles = {};

	$(function() {
		/* Check whether KB is enabled; if not, do nothing */
		$('#knbu-type-selector').change(function (e) { GetKnbuInfo(e); });
	
		if(!$('body').hasClass('knbu-map-full')) {
			$('#submit-reply.knbu-submit').click(function(e) {
				
				var form = $(this).closest('form');
				var ok = true;
				var error = '';
				
				if(!form.find('#knbu-type-selector').first().val() || form.find('#knbu-type-selector').first().val() == form.find('#knbu-type-selector').find('option').first().val()) {
					ok = false;
					error += 'Knowledge type field is required!\n';
				}
				
				if(form.find('textarea[name="comment"]').first().val().length == 0) {
					ok = false;
					error += 'Comment field is required!\n';
				}
				
				if(form.find('#title').hasClass('required-field') && form.find('#title').val().length == 0) {
					ok = false;
					error += 'Main idea field is required!\n';
				}
				
				if(!ok) {
					e.preventDefault();
					alert(error);
				}
			});
		}
		
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
			var comment_body = $(this).closest('.comment');
			
			if(comment_body.find('#respond').length > 0) 
				comment_body.find('#respond').toggle(200);
			else {
			
				$('#comment_parent').val(comment_body.data('id'));
				$('#respond').hide().insertAfter(this).show(200);
			}
			
			if($(this).text() == 'Reply') {
				$('.comment-reply-link').text('Reply');
				$(this).text('Close');
			}
			else
				$(this).text('Reply');
		});


		$("#comment_sorter li").click(function(e) {
			e.preventDefault();
			var $target = $(e.target);
			var $list = $(".commentlist");
			var $coms = $list.find(".comment");
			var coms = $coms.get();
			var type = $target.data('type');
			if(type != 'as thread') {
			   $list.removeClass('thread-sorted');
			}
			
			if ( cur_sort == type ) 
				sort_order = sort_order * -1; 
			else 
				sort_order = 1;
				
				if(sort_order > 0) {
					$('.sort-up').css({ opacity: 0.2 }); 
					$('.sort-down').css({ opacity: 0.8 }); 
				}
				else {
					$('.sort-up').css({ opacity: 0.8 }); 
					$('.sort-down').css({ opacity: 0.2 }); 
				}
			
			$('.thread-title').hide();
			
		   if(type != 'on-a-map') {
			   $('#map-frame').hide();
			   $('#comment-frame').show();
		   }
			switch(type) {
				case 'on-a-map':
				$('#map-frame').show();
				$('#comment-frame').hide();
				break;
				
				case 'as-thread':
				if(!$list.hasClass('thread-sorted'))
					$list.addClass('thread-sorted');
					
				coms.sort(function(a,b) {
					var ca = parseInt($(a).data('comment-index'));
					var cb = parseInt($(b).data('comment-index'));
					return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
				});
				break;
				
				case 'by-date':
				
				if(!threadTitles.date) {
					threadTitles.date = [];
					for(var com in coms) { 
						var date = $(coms[com]).data('date');
						if(!threadTitles.date[date]) 
						{ threadTitles.date[date] = date; } 
					}
				}
				
				coms.sort(function(a,b) {
					var ca = $(a).data('stamp');
					var cb = $(b).data('stamp');
					return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
				});
				break;
				
				case 'by-person': 
				if(!threadTitles.authors) {
					threadTitles.authors = [];
					for(var com in coms) { 
						var title = $(coms[com]).find('.message-username').first();
						if(!threadTitles.authors[title.text()]) 
						{ threadTitles.authors[title.text()] = title.text(); } 
					}
				}
				
				coms.sort(function(a,b) {
					var ca = $(a).find(".message-username").text().toLowerCase();
					var cb = $(b).find(".message-username").text().toLowerCase();
					return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
				});
				break;
				
				case 'by-knowledge-type':
				if(!threadTitles.knowledgeTypes) {
					threadTitles.knowledgeTypes = [];
					for(var com in coms) { 
						var title = $(coms[com]).find('.message-type').first();
						if(!threadTitles.knowledgeTypes[title.data('type')]) 
						{ threadTitles.knowledgeTypes[title.data('type')] = title.text(); } 
					}
				}
				
				coms.sort(function(a,b) {
					var ca = $(a).data('type');
					var cb = $(b).data('type');
					return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
				});
				break;
			}
			$.each(coms,function(idx,itm) { $("#comment-frame").append(itm); });
		   
			if(type == 'by-knowledge-type') {
				$('.thread-title-knbu').show();
				if($('.thread-title-knbu').length == 0) {
					for(var key in threadTitles.knowledgeTypes) {
						var name = threadTitles.knowledgeTypes[key];
						
						if(!key || key.length == 0) 
							name = 'Unspecified';
							
						var $title = $('<h3>');
						$title.text(name);
						$title.attr('data-type', key);
						$title.addClass('thread-title thread-title-knbu');
						
						$title.insertBefore($('.message-type[data-type="'+key+'"]').first().closest('.knbu-comment'));
					}
				}
				else {
					$('.thread-title-knbu').each(function() {
						$(this).insertBefore($('.message-type[data-type="'+$(this).data('type')+'"]').first().closest('.knbu-comment'));
					});
				}
			}
			else if(type == 'by-person') {

				$('.thread-title-author').show();
				if($('.thread-title-author').length == 0) {
					for(var key in threadTitles.authors) {
						var name = threadTitles.authors[key];
						
						if(!key || key.length == 0) 
							name = 'Unspecified';
							
						var $title = $('<h3>');
						$title.text(name);
						
						$title.addClass('thread-title thread-title-author');
						
						$title.insertBefore($('.message-username:contains("'+key+'")').first().closest('.knbu-comment'));
					}
				}
				else {
					$('.thread-title-author').each(function() {
						$(this).insertBefore($('.message-username:contentIs("'+$(this).html()+'")').first().closest('.knbu-comment'));
					});
				}
			}
			else if(type == 'by-date') {

				$('.thread-title-date').show();
				if($('.thread-title-date').length == 0) {
					for(var key in threadTitles.date) {
						var name = threadTitles.date[key];
						
						if(!key || key.length == 0) 
							name = 'Unspecified';
							
						var $title = $('<h3>');
						$title.text(name);
						
						$title.addClass('thread-title thread-title-date');
						
						$title.insertBefore($('.message-date:contains("'+key+'")').first().closest('.knbu-comment'));
					}
				}
				else {
					$('.thread-title-date').each(function() {
						$(this).insertBefore($('.message-date:contains("'+$(this).html()+'")').first().closest('.knbu-comment'));
					});
				}
			}

			 $("#comment_sorter li").removeClass('selected');
			 $target.addClass('selected');
			 
			 
			 cur_sort = type;
		   //console.timeEnd('total');
		 });

	});
	
})(jQuery);