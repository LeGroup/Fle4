/* Javascript magic */

$j = jQuery.noConflict();

var ktype_changed=false;
var ktype_color="";
var orig_comments="";
var cur_sort="";
var sort_order=1;

function knbu_disable() {
 $j("#comment").fadeTo(0,0.33);
 $j("#comment")[0].disabled=true;
 $j("#submit")[0].disabled=true;
}

function knbu_enable() {
 $j("#comment")[0].disabled=false;
 $j("#comment").fadeTo("def",1.0).focus();
 $j("#submit")[0].disabled=false;
}

function scaffold_update(callback) {
 var ktype = $j("#knbu_real_ktype")[0].value;
 var link = $j(this);
 $j.post(".", {
   knbu_ktype_info: ktype
  }, function(data) {
   if ( ktype_color ) {
    $j("#knbu_heading,#knbu_popup_heading").removeClass(ktype_color);
   }
   $j("#knbu_heading,#knbu_popup_heading").text(data.name).addClass(data.color);
   ktype_color = data.color;
   $j("#knbu_checklist").html(data.checklist);
   $j("#knbu_popup_p").html(data.description);
   $j("#comment").text(data.phrases);
   $j("#comment").select();
   if (callback) callback();
  }, "json");
}

function scaffold_switch() {
  $j("#knbu_scaffold").fadeTo("slow",1.0);
}

function scaffold_open() {
 $j("#knbu_scaffold").slideDown("slow");
}

$j(document).ready(function() {
 /* Check whether KB is enabled; if not, do nothing */
 if ($j("#knbu").length==0) { return; }

 knbu_disable();

 /* Move selector to correct place */
 $j("#comment").parent().prev().append($j("#knbu"));
 $j("#knbu").show();

 $j("#knbu_select").click(function(e) {
  e.preventDefault();
  if ( ! $j("#knbu_ktype")[0].value ) {
   knbu_disable();
   if ( ! ktype_changed )
    $j("#knbu_ktype").fadeOut("fast").fadeIn("fast").fadeOut("fast").fadeIn("fast");
  } else {
   $j("#knbu_real_ktype").val($j("#knbu_ktype").val());
   $j("#knbu_ktype2").val($j("#knbu_ktype").val());

   scaffold_update(function() {
     scaffold_open();
     $j("#knbu_init").slideUp("slow");
     knbu_enable();
   });
  }
 });
 $j("#knbu_select2").click(function(e) {
  e.preventDefault();
  $j("#knbu_real_ktype").val($j("#knbu_ktype2").val());
  $j("#knbu_scaffold").fadeTo("slow",0.1,function(){scaffold_update(scaffold_switch);});
 });

 $j("#knbu_ktype").select(function(e) {
  ktype_changed=true;
 });

 $j("#knbu_popper").simpleDialog();

 //orig_comments = $j(".commentlist").clone(); 


 $j("#comment_sorter li").click(function(e) {
   e.preventDefault();
   var $target = $j(e.target);
   var $jlist = $j(".commentlist");
   var $coms = $jlist.find("li.comment");
   var coms = $coms.get();
   var doOnce = 0;
   //console.time('total');
   if (!doOnce) doOnce=1; else return;
   //console.time('sort');
   
   if($target.html() != 'as thread') {
	   $j('.commentlist').removeClass('thread-sorted');
		if ( cur_sort = $target.html() ) 
			sort_order = sort_order * -1; 
		else 
			sort_order = 1;
	}
	
   if($target.html() != 'as map') {
	   $j('#map-frame').hide();
	   $j('#comment-frame').show();
   }
	switch($target.html()) {
		case 'as map':
		$j('#map-frame').show();
		$j('#comment-frame').hide();
		break;
		
		case 'as thread':
		$j('.commentlist').addClass('thread-sorted');
		coms.sort(function(a,b) {
			var ca = parseInt($j(a).attr('data-comment-index'));
			var cb = parseInt($j(b).attr('data-comment-index'));
			return (ca < cb) ? -sort_order: (ca > cb) ? sort_order : 0;
		});
		break;
		
		case 'by date':
		coms.sort(function(a,b) {
			var ca = new Date($j(a).find(".commentmetadata a:first-child").html().replace('at', '')).getTime();
			var cb = new Date($j(b).find(".commentmetadata a:first-child").html().replace('at', '')).getTime();
			return (ca < cb) ? -1*sort_order: (ca > cb) ? 1*sort_order : 0;
		});
		break;
		
		case 'by person': 
		coms.sort(function(a,b) {
			var ca = $j(a).find(".comment-author cite.fn").text().toLowerCase();
			var cb = $j(b).find(".comment-author cite.fn").text().toLowerCase();
			return (ca < cb) ? -1*sort_order: (ca > cb) ? 1*sort_order : 0;
		});
		break;
		
		case 'by knowledge type':
		coms.sort(function(a,b) {
			var ca = $j(a).find(".kbtype-label").html();
			var cb = $j(b).find(".kbtype-label").html();
			return (ca < cb) ? -1*sort_order: (ca > cb) ? 1*sort_order : 0;
		});
		break;
	}
   $j.each(coms,function(idx,itm) { $j("#comment-frame").append(itm); });
   

     $j("#comment_sorter li").css("font-weight","normal");
     $target.css("font-weight","bold");
	 
	 
     cur_sort=$target.html();
   //console.timeEnd('total');
 });

});