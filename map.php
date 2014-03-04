<?php
$replies = get_comments(array(
			'status' => 'approve',
			'post_id' => get_the_ID(),
			'orderby' => 'date'
			));
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1"/>
	<title><?php the_title(); ?> (Map) | <?php bloginfo('name'); ?></title>
	<link href='http://fonts.googleapis.com/css?family=Junge' rel='stylesheet' type='text/css'>
	<?php wp_head(); ?>
</head>
<body class="knbu-map-view <?php echo isset($_GET['map-frame']) ? 'knbu-map-frame' : 'knbu-map-full'; ?>">
	<div id="map">
		<div id="raven"></div>
		<div id="fps"></div>
		<div id="grouping">
			Show notes: <select id="grouping-select">
				<option value="discussion">as discussion</option>
				<option value="knowledgetypes">by knowledge types</option>
				<option value="users">by authors</option>
				<option value="time">by time</option>
			</select>
		</div>
		<div id="navigation">
			<img src="<?php echo plugins_url('knowledge-building'); ?>/images/toggle-hide.png" width="15" height="15" id="navi-toggle-button">
			<div id="navi-toggle-container">
				<div id="pan">
					<img src="<?php echo plugins_url(); ?>/knowledge-building/images/navi-bg.png" id="navigation-background">
					<img src="<?php echo plugins_url(); ?>/knowledge-building/images/arrow-left.png" class="arrow" id="arrow-left">
					<img src="<?php echo plugins_url(); ?>/knowledge-building/images/arrow-up.png" class="arrow" id="arrow-up">
					<img src="<?php echo plugins_url(); ?>/knowledge-building/images/arrow-right.png" class="arrow" id="arrow-right">
					<img src="<?php echo plugins_url(); ?>/knowledge-building/images/arrow-down.png" class="arrow" id="arrow-down">
					<img src="<?php echo plugins_url(); ?>/knowledge-building/images/center.png" class="arrow" id="arrow-center">
				</div>
				+<div id="zoom"></div>-
			</div>
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
	
	<div id="message"><?php knbu_comment(get_the_ID()); ?></div>
		<?php
			usort($replies, 'knbu_cmp');
			knbu_get_childs(get_the_ID(), $replies);
		?>
	</body>
</html>
<?php


function knbu_get_childs($id, $replies) {
	global $knowledgeTypes, $knbu_kbsets, $post;
	
	// The post itself will be the starting node
	$nodes = array(
				array(	
					'id' => 0,
					'parent' => false,
					'content' => $post->post_content,
					'avatar' => knbu_get_avatar_url( $post->user_id ),
					'username' => get_the_author_meta( 'display_name', $post->post_author ),
					'email' => $post->user_email,
					'date' => date(get_option('date_format'), strtotime($post->post_date)),
					'time' => date(get_option('time_format'), strtotime($post->post_date)), 
					'timestamp' => strtotime( $post->post_date ),
					'typeName' => 'Start',
					'title' => $post->post_title,
					'static' => true,
					'index' => 1
				)
	);
	
	
	$map_index = get_post_meta( $id, 'knbu_map_index', true);
	
	if(empty($map_index))
		$map_index = 2;
		
	foreach($replies as $reply) {
		
		// Get comment meta data
		// Should be combined to one variable(?)
		$type = get_comment_meta($reply->comment_ID, 'kbtype', true);
		$title = get_comment_meta($reply->comment_ID, 'comment_title', true);
		$node_index = get_comment_meta( $reply->comment_ID, 'knbu_map_comment_index' );
		$anchor = json_decode(get_comment_meta($reply->comment_ID, 'node_position', true));
		
		// Default values
		$name = 'Unspecified';
		$color = '#fff';
		
		// Get type name and color 
		foreach($knbu_kbsets[knbu_get_kbset_for_post(get_the_ID())]->KnowledgeTypeSet->KnowledgeType as $t) {	
			if($t['ID'] == $type) {
				$name = (string)$t['Name']; 
				$color = (string)$t['Colour'];
			}
		}
		
		// If there's no title, get some text from content to be one
		$title = knbu_generate_title($title, $reply->comment_content);
		
		
		// Check if there's no index set for the note
		if(empty($node_index)) {
			$node_index = $map_index;
			$map_index++;
			update_comment_meta( $reply->comment_ID, 'knbu_map_comment_index', $node_index );
			update_post_meta( $id, 'knbu_map_index', $map_index);
		}
		
		$reply->user_email = isset($reply->user_email) ? $reply->user_email : '';
		
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
				'index' => $node_index
		);
	}
	
	echo '<script type="text/javascript">var NodesFromServer = '.json_encode($nodes).'; var MapIndexFromServer = '.$map_index.'; var plugin_url = "'.plugins_url('knowledge-building').'";</script>';
}


function knbu_cmp($a, $b) {
	if(strtotime($a->comment_date) == strtotime($b->comment_date)) 
		return 0;
	return strtotime($a->comment_date) > strtotime($b->comment_date) ? 1 : -1;
}
?>