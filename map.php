<?php
$replies = get_comments(array(
			'status' => 'approve',
			'post_id' => get_the_ID()
			));
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta http-equiv="X-UA-Compatible" content="IE=Edge"/>
	<title><?php the_title(); ?> (Map) | <?php bloginfo('name'); ?></title>
	<link href='http://fonts.googleapis.com/css?family=Junge' rel='stylesheet' type='text/css'>
	<?php wp_head(); ?>
</head>
<body class="knbu-map-view <?php echo isset($_GET['map-frame']) ? 'knbu-map-frame' : 'knbu-map-full'; ?>">
	<div id="map">
		<div id="raven"></div>
		<div id="fps"></div>
		<div id="grouping">
			<ul>
				<li><a id="grouping-byknowledgetypes">Group by knowledge types</a></li>
				<li><a id="grouping-byauthors">Group by authors</a></li>
				<li><a id="grouping-discussion">Discussion</a></li>
				<li><a id="grouping-time">Time</a></li>
			</ul>
		</div>
		<div id="navigation">
			<div id="pan">
				<img src="<?php echo plugins_url(); ?>/knowledge-building/images/navi-bg.png" id="navigation-background">
				<img src="<?php echo plugins_url(); ?>/knowledge-building/images/arrow-left.png" class="arrow" id="arrow-left">
				<img src="<?php echo plugins_url(); ?>/knowledge-building/images/arrow-up.png" class="arrow" id="arrow-up">
				<img src="<?php echo plugins_url(); ?>/knowledge-building/images/arrow-right.png" class="arrow" id="arrow-right">
				<img src="<?php echo plugins_url(); ?>/knowledge-building/images/arrow-down.png" class="arrow" id="arrow-down">
				<img src="<?php echo plugins_url(); ?>/knowledge-building/images/center.png" class="arrow" id="arrow-center">
				<!-- <div class="left"></div>
				<div class="right"></div>
				<div class="up"></div>
				<div class="down"></div>
				<div class="center"></div> -->
			</div>
			<div id="zoom"></div>
		</div>
		<div id="legend">
			<ul>
				<?php knbu_get_legends(); ?>
			</ul>
		</div>
		<?php if(isset($_GET['map-frame'])) { ?>
		<div id="full-screen">
			<a href="<?php echo remove_query_arg( 'map-frame' ); ?>" target="_blank">
				<img src="<?php echo plugins_url() ?>/knowledge-building/images/full-screen.png" id="full-screen">
			</a>
		</div>
		<?php } ?>
	</div>
	
	<div id="message">
		<div class="message-header">
			<h4 class="message-type"></h4>
			<img class="message-avatar">
			<span class="message-username"></span>
			<br />
			<a id="message-link">#</a> <span class="message-title"></span>
			<span class="message-date"></span>
		</div>
		<div class="message-content-wrapper">
			<div class="message-content"></div>
			<div style="clear:both"></div>
		<a class="reply-toggle knbu-form-link" id="open-reply">Reply</a>
		<div id="reply-wrapper">
			<?php knbu_comment_form_map(get_the_ID()); ?>
		</div>
		<div style="clear:both"></div>
		</div>
	</div>
		<?php
			usort($replies, 'knbu_cmp');
			knbu_get_childs(0, $replies);
		?>
	</body>
</html>
<?php
function knbu_get_childs($id, $replies) {
	global $knowledgeTypes, $knbu_kbsets, $post;
	
	$index = 1;
	$nodes = array(
				array(	
					'id' => 0,
					'parent' => false,
					'content' => $post->post_content,
					'avatar' => knbu_get_avatar_url( $post->user_id ),
					'username' => get_the_author_meta( 'display_name', $post->post_author ),
					'email' => $post->user_email,
					'date' => date(get_option('date_format').' '.get_option('time_format'), strtotime($post->post_date)),
					'timestamp' => strtotime( $post->post_date ),
					'typeName' => 'Start',
					'title' => $post->post_title,
					'static' => true,
					'index' => $index
				)
	);
	
	foreach($replies as $reply) {
		$index++;
		$type = get_comment_meta($reply->comment_ID, 'kbtype', true);
		$name = 'Unspecified';
		$color = '#000';
		$anchor = json_decode(get_comment_meta($reply->comment_ID, 'node_position', true));
		
		foreach($knbu_kbsets[knbu_get_kbset_for_post(get_the_ID())]->KnowledgeTypeSet->KnowledgeType as $t) {	
			if($t['ID'] == $type) {
				$name = (string)$t['Name']; 
				$color = (string)$t['Colour'];
			}
		}
		$title = get_comment_meta($reply->comment_ID, 'comment_title', true);
		if(strlen($title) <= 0) {
			$words = explode(' ', $reply->comment_content);
			$title = implode(' ', array_slice($words, 0, 3));
			$title = substr($title, 0, 50);
			$title .= '...';
		}
		
		$nodes[] = array(
				'id' => $reply->comment_ID,
				'parent' => $reply->comment_parent,
				'content' => $reply->comment_content,
				'avatar' => knbu_get_avatar_url($reply->user_id),
				'username' => $reply->comment_author,
				'email' => $reply->user_email,
				'date' => date(get_option('date_format').' '.get_option('time_format'), strtotime($reply->comment_date)),
				'timestamp' => strtotime($reply->comment_date),
				'title' => $title,
				'typeName' => $name,
				'anchor' => $anchor,
				'color' => $color,
				'index' => $index
			);
	}
	echo '<script type="text/javascript">var NodesFromServer = '.json_encode($nodes).';</script>';
}


function knbu_cmp($a, $b) {
	if(strtotime($a->comment_date) == strtotime($b->comment_date)) 
		return 0;
	return strtotime($a->comment_date) > strtotime($b->comment_date) ? 1 : -1;
}
?>