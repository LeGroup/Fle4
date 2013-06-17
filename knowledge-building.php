<?php
/*
Plugin Name: Knowledge Building
Plugin URI: http://fle4.uiah.fi/kb-wp-plugin
Description: Use post comment threads to facilitate meaningful knowledge building discussions. Comes with several knowledge type sets (eg. progressive inquiry, six hat thinking) that can be used to semantically tag comments, turning your Wordpress into a knowledge building environment. Especially useful in educational settings.
Version: 0.6.12
Author: Tarmo Toikkanen, Antti Sandberg
Author URI: http://tarmo.fi
*/

/*  Copyright 2009-2013  Tarmo Toikkanen  (email : tarmo@iki.fi), Antti Sandberg (email : antti.sandberg@gmail.com)

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

global $knbu_db_version;
$knbu_db_version='0.12';
$knbu_plugin_version = '0.6.12';

add_action('init', 'knbu_init_mapview');
add_action('wp_enqueue_scripts', 'knbu_enqueue_scripts');
//add_action('comment_form', 'knbu_comment_form_map');
add_action('init','knbu_ajax_hook');
add_action('wp_print_scripts', 'knbu_script_load');
add_action('wp_print_styles', 'knbu_custom_stylesheet');
add_action('comments_array', 'knbu_fetch_ktypes', 10, 2);
add_action('comment_post', 'knbu_store_comment');
add_action('admin_menu', 'knbu_plugin_menu');
add_action('admin_init', 'knbu_upgrade_hook' );

add_action('wp_ajax_nopriv_knbu_new_reply', 'knbu_new_reply_ajax');
add_action('wp_ajax_knbu_new_reply', 'knbu_new_reply_ajax');
add_action('wp_ajax_nopriv_knbu_save_node_position', 'knbu_save_node_position');
add_action('wp_ajax_knbu_save_node_position', 'knbu_save_node_position');
add_action('wp_ajax_knbu_provide_knbu_info', 'knbu_provide_knbu_info');
add_action('wp_ajax_nopriv_knbu_provide_knbu_info', 'knbu_provide_knbu_info');

add_filter( 'comments_template', 'knbu_comment_template' );
add_filter( 'template_include', 'knbu_map_view_template' );
add_filter( 'comment_save_pre', 'knbu_store_comment' );

register_activation_hook(__FILE__,'knbu_install');

function knbu_upgrade_hook() {
	global $knbu_plugin_version, $wpdb;
	
	if(get_option( 'knbu_plugin_version' ) != $knbu_plugin_version) {
		
		$table_name = $wpdb->prefix . 'knowledgetypes';
		
		if( $wpdb->get_var("SHOW TABLES LIKE '$table_name'") == $table_name ) 
		{ knbu_custom_table_to_comment_meta(); }
		
		update_option( 'knbu_plugin_version', $knbu_plugin_version );
	}
}

/*
 * This code snippet loads the XML specifications of KB typesets into memory.
 * Uses wp_cache to optimize performance.
 */
$knbu_kbsets = wp_cache_get('knbu_kbsets');

if ( $knbu_kbsets == false ) {
	$knbu_kbsets = array();
# Read available KBset xml files into memory
	$kbset_dir = __DIR__.DIRECTORY_SEPARATOR.'kbsets';
	$d = dir($kbset_dir);
	while ( false != ($entry = $d->read()) ) {
		if ( ereg('\.xml$',strtolower($entry)) ) {
			$fname = explode('.',$entry);
			$fname = $fname[0];
			$knbu_kbsets[$fname]=simplexml_load_file($kbset_dir.DIRECTORY_SEPARATOR.$entry);
		}
	}
	wp_cache_set('knbu_kbsets',$knbu_kbsets);
}

/**
 * Hooked into plugin activation.
 *
 * Sets up additional database table and necessary options.
 */
function knbu_install() {
	global $wpdb, $knbu_db_version;

	add_option('knbu_categories');

	$installed_version = get_option('knbu_db_version');
	if ( $installed_version != $knbu_db_version) {
		add_option('knbu_db_version', $knbu_db_version);
	}
}


/**
 * Register option page for this plugin.
 */
function knbu_plugin_menu() {
	add_options_page('Knowledge Building Plugin Options', 'Knowledge Building', 'administrator', __FILE__, 'knbu_plugin_options');
	// Temporarily added installation hook here, since register_activation_hook doesn't work properly
	knbu_install();
}

/**
 * Define option page for this plugin.
 * This option page is used to map KB typesets to post categories.
 */
function knbu_plugin_options() {
	global $knbu_kbsets;
	$hidden = 'knbu_form_posted';

# Update options if form is submitted
	if ( isset($_POST[$hidden]) && $_POST[$hidden] == 'Y' ) {
		$sels = array();
		foreach ( $knbu_kbsets as $file => $xml ) {
			$fname = explode('.',$file);
			$fname = $fname[0];
			foreach ( get_categories(array('hide_empty' => 0)) as $name => $cat ) {
				$value = $_POST['cat_' . $cat->cat_ID];
				$sels[$cat->cat_ID] = $value;
			}
		}
		update_option('knbu_categories',$sels);
		update_option('knbu_main_title_required', $_POST['main-title-field'] == 'required');
	}
	$sels = get_option('knbu_categories'); ?>
		<div class="wrap">
			<form method="post" action="<?php echo $_SERVER['REQUEST_URI']; ?>">
			<input type="hidden" name="<?php echo $hidden; ?>" value="Y"/>
			<h2>Select Knowledgetype Sets to use with each Category</h2>
			<p>
				<table style="width: 100%; cell-spacing: 10px; padding-left: 40px;">
				<tr valign="top">
				<td></td>
				<?php foreach ( get_categories(array('hide_empty' => 0)) as $name => $cat ) { ?>
					<th style="text-align:center;font-weight: bold;"><?php echo $cat->name; ?></th>
				<?php } ?>
				</tr>
				<tr>
					<th style="text-align: left">None</th>
					<?php foreach ( get_categories(array('hide_empty' => 0)) as $name => $cat ) { ?>
						<td style="text-align:center;padding:10px 0;"><input type="radio" name="<?php echo 'cat_' . $cat->cat_ID;?>" value="" <?php if (!isset($sels[$cat->cat_ID]) || !$sels[$cat->cat_ID]) { echo 'checked="checked"'; } ?>/></td>
					<?php } ?>
				</tr>
				<?php foreach ( $knbu_kbsets as $file => $xml ) {
					$fname = explode('.',$file);
					$fname = $fname[0];
					?>
					<tr style="padding: 10px 0">
					<th style="padding: 10px 0;text-align: left"><?php echo $xml->KnowledgeTypeSet['Name']; ?>
					</th>
					<?php foreach ( get_categories(array('hide_empty' => 0)) as $name => $cat ) { ?>
						<td style="text-align:center"><input type="radio" name="<?php echo 'cat_' . $cat->cat_ID; ?>" value="<?php echo $fname; ?>" <?php if (isset($sels[$cat->cat_ID]) && $sels[$cat->cat_ID] == $fname) { echo 'checked="checked"'; } ?>/></td>
					<?php } ?>
					</tr>
				<?php } ?>
				</table>
			</p>
			<h2>Other</h2>
			<p>
				<table style="min-width: 50%; margin-left: 40px;">
					<tr>
						<th style="text-align: left;">Main idea field is </th>
						<td><input type="radio" name="main-title-field" value="required" <?php if(get_option('knbu_main_title_required')) { echo 'checked'; } ?>> Required</td>
						<td><input type="radio" name="main-title-field" value="optional" <?php if(!get_option('knbu_main_title_required')) { echo 'checked'; } ?>> Optional</td>
					</tr>
				</table>
			</p>
			<p class="submit">
			<input type="submit" class="button-primary" value="<?php _e('Save Changes'); ?>" />
			</p>
			</form>
		</div>
		<?php
}

/**
 * Retrieve the KB typeset used for the current post.
 *
 * If a post belongs to multiple categories, this function will return the
 * KB typeset of the last category (as returned by get_the_category) that
 * has a KB typeset mapped to it.
 *
 * @uses get_the_category
 * @return string Found KB typeset or false if not found.
 */
function knbu_get_kbset_for_post($id = false) {
	global $post;
	
	if(!$id)
		$id = $post->ID;
	
	$kbset = false;
	$sels = get_option('knbu_categories');
	
	foreach ( get_the_category($id) as $cat ) {
		$value = $sels[$cat->cat_ID];
		if ( $value ) $kbset = $value;
	}
	return $kbset;
}

/**
 * Retrieve the KB type for a comment.
 *
 * Note that this needs to be called inside the Wordpress loop, so that the
 * global $post points to the correct post. The comment passed as a parameter
 * of course should be a comment to that post.
 *
 * @uses knbu_get_kbset_for_post
 * @param  object  $comment  The comment whose KB type is needed
 * @return array             The KB type for the comment
 */

function knbu_get_ktype_for_comment($comment) {
	global $knbu_kbsets,$post;
	$kbset = knbu_get_kbset_for_post();
	$kbtypes = $knbu_kbsets[$kbset]->KnowledgeTypeSet[0]->KnowledgeType;
	foreach ( $kbtypes as $ktype ) {
		if ( $ktype['ID'] == $comment->ktype ) return $ktype;
	}
	return false;
}

/**
 * Store comment's KB set information.
 *
 * This function is hooked to comment_post action and comment_save_pre filter.
 *
 * @param mixed   $comment  Either a numeric comment ID or a comment Array
 */
function knbu_store_comment($comment) {
	global $wpdb;
	if ( !isset( $_POST['knbu_type'] ) ) return $comment;
	$ktype = $_POST['knbu_type'];
	
	if (is_numeric($comment))
		$comment = get_comment($comment);
		
	// Get map index
	// Basically just the node number
	$map_index = get_post_meta( $comment->comment_post_ID, 'knbu_map_index', true );
	update_post_meta( $comment->comment_post_ID, 'knbu_map_index', $map_index + 1 );
	
	
	//update_comment_meta( $id, 'knbu_map_comment_index', $var->index ); 
	update_comment_meta( $comment->comment_ID, 'comment_title', $_POST['title'] );
	update_comment_meta( $comment->comment_ID, 'kbtype', $ktype );
	update_comment_meta( $id, 'knbu_map_comment_index', $map_index ); 
	return $comment;
}
/**
 * Fetch the KB types for all comments.
 *
 * This function is hooked to the coments_array action. It retrieves all the
 * KB type information for the comments of the specified post.
 *
 * @param  array  $comments  Comments that should be populated with KB type information
 * @param  int    $post_id   Post ID whose comments are scanned.
 * @return array             Comments that are populated with KB type information
 */
function knbu_fetch_ktypes($comments, $post_id) {
	foreach($comments as $comment) 
		$comment->ktype = get_comment_meta( $comment->comment_ID, 'kbtype', true); 
	
	return $comments;
}

/**
 * Alternative tag for showing comments.
 *
 * Loads kbtype information and uses a custom walker. This tag should be added to
 * the comments.php template, replacing 'wp_list_comments'.
 *
 * @uses knbu_get_kbset_for_post
 * @uses knbu_fetch_ktypes
 * @uses wp_list_comments
 * @uses Walker_KB
 * @param array  $args      Optional arguments
 * @param array  $comments  Comments that should be listed
 */
function knbu_list_comments($args = array(), $comments = null) {
	global $wp_query;

	if(!knbu_get_kbset_for_post(get_the_ID())) {
		wp_list_comments($args, $comments);
		return;
	}
	
	?>
	<input type="hidden" id="knbu-exists">
	<div id="comment_sorter">
		
	Show notes
	<ul>
	<li>as map</li>
	<li>as thread</li>
	<li>by knowledge type</li>
	<li>by person</li>
	<li>by date</li>
	</ul>
	</div>
	<div id="map-frame">
		<img src="<?php echo plugins_url(); ?>/knowledge-building/images/map-view-banner.png">
		<!-- <iframe src="<?php echo add_query_arg( array( 'map-view' => '1', 'map-frame' => '1' ) ); ?>" style="width: 100%; height: 720px;"></iframe>-->
		</div>
	<div id="comment-frame" class="commentlist" style="display: none">
		<?php

		$kbtype = knbu_get_kbset_for_post();
		if ( !$kbtype ) {
			wp_list_comments();
		} else {
			$comments = knbu_fetch_ktypes($wp_query->comments,$wp_query->post->ID);
			wp_list_comments(array('walker'=>new Walker_KB),$comments);
		}
		
		?>
	</div>
	<?php
}

/**
 * Walker customized to display KB information for comments. 
 *
 * This Walker code is essentially a copy of Walker_Comment, but extended to
 * display custom comment KB types.
 */
$comment_index = 0;
class Walker_KB extends Walker_Comment {
	/**
	 * @see Walker_Comment::start_el()
	 * @since unknown
	 *
	 * Overrides Walker_Comment's start element method. Most of the method is copy-paste,
	 * we just add additional metadata and style information.
	 *
	 * @param string $output Passed by reference. Used to append additional content.
	 * @param object $comment Comment data object.
	 * @param int $depth Depth of comment in reference to parents.
	 * @param array $args
	 */
	function start_el(&$output, $comment, $depth, $args) {
		global $comment_index; 
		$depth++;
		$GLOBALS['comment_depth'] = $depth;

		if ( !empty($args['callback']) ) {
			call_user_func($args['callback'], $comment, $args, $depth);
			return;
		}

		$GLOBALS['comment'] = $comment;
		extract($args, EXTR_SKIP);

		$ktype = knbu_get_ktype_for_comment($comment);

		if ( 'div' == $args['style'] ) {
			$tag = 'div';
			$add_below = 'comment';
		} else {
			$tag = 'li';
			$add_below = 'div-comment';
		}
			?>
				<<?php echo $tag ?> <?php comment_class(empty( $args['has_children'] ) ? '' : 'parent') ?> id="comment-<?php comment_ID() ?>" data-comment-index="<?php echo ++$comment_index; ?>">
				<?php if ( 'ul' == $args['style'] ) : ?>
				<div id="div-comment-<?php comment_ID() ?>" class="comment-body" style="background-color: <?php echo ' ' . $ktype['Colour']; ?>">
				<?php endif; ?>
				<div class="kbtype-label"><?php echo get_comment_meta(get_comment_ID(), 'knbu_map_comment_index', true ); ?> - <span><?php echo $ktype['Name']; ?></span></div>
				<div class="comment-author vcard">
				<?php if ($args['avatar_size'] != 0) echo get_avatar( $comment, $args['avatar_size'] ); ?>
				<?php printf(__('<cite class="fn">%s</cite> <span class="says">says:</span>'), get_comment_author_link()) ?>
				</div>
<?php if ($comment->comment_approved == '0') : ?>
				<em><?php _e('Your comment is awaiting moderation.') ?></em>
				<br />
<?php endif; ?>
				<div class="comment-meta commentmetadata">
					<a href="<?php echo htmlspecialchars( get_comment_link( $comment->comment_ID ) ) ?>" data-stamp="<?php echo strtotime(get_comment_date('Y-m-d').' '.get_comment_time('H:i:s')); ?>"><?php printf(__('%1$s at %2$s'), get_comment_date(),  get_comment_time()) ?></a><?php edit_comment_link(__('(Edit)'),'&nbsp;&nbsp;','') ?></div>

				<?php comment_text() ?>

				<div class="reply">
				<?php comment_reply_link(array_merge( $args, array('add_below' => $add_below, 'depth' => $depth, 'max_depth' => $args['max_depth']))) ?>
				</div>
				<?php if ( 'ul' == $args['style'] ) : ?>
				</div>
				<?php endif; ?>
   <?php
	}
}
	
	
/*
 * Add custom stylesheets to style queue.
 *
 * Hooked to wp_print_styles action.
 */
function knbu_custom_stylesheet() {
	$myStyleUrl = WP_PLUGIN_URL . '/knowledge-building/style.css';
	$myStyleFile = WP_PLUGIN_DIR . '/knowledge-building/style.css';
	if ( file_exists($myStyleFile) ) {
		wp_enqueue_style( 'myStyleSheets', $myStyleUrl);
	}
	//wp_enqueue_style('jquery-simpledialog', WP_PLUGIN_URL . '/knowledge-building/jquery.simpledialog/simpledialog.css');
}
/**
 * Add custom javascript files when needed.
 * Hooked to wp_print_scripts action. Only adds scripts when displaying comments.
 */
function knbu_script_load() {
	if ( ( is_single() || is_page() ) && comments_open() ) {
		//wp_enqueue_script('jquery-simpledialog', WP_PLUGIN_URL . '/knowledge-building/jquery.simpledialog/simpledialog.js', array('jquery'));
		wp_enqueue_script('knbu', WP_PLUGIN_URL . '/knowledge-building/knowledgebuilding.js', array('jquery','jquery-color') );
	}
}
	
/**
 * Ajax hook.
 *
 * Hooked to init action to insert our own ajax handler to the wp action
 * whenever the 'knbu_ktype_info' variable is detected.
 */
function knbu_ajax_hook() {
	if ( isset( $_POST['knbu_ktype_info'] ) ) add_action('wp','knbu_ajax_ktype_provider');
}
/**
 * Ajax method called by comment form.
 *
 * Hooked to wp action by knbu_ajax_hook. Will die after sending information, so
 * it only returns the json formatted data.
 *
 * @uses knbu_get_kbset_for_post
 * @uses json_encode
 */
function knbu_provide_knbu_info() {
	global $knbu_kbsets;
	$kbset = knbu_get_kbset_for_post($_POST['post_ID']);
	$requested = $_POST['knbu_ID'];
	
	foreach ( $knbu_kbsets[$kbset]->KnowledgeTypeSet[0]->KnowledgeType as $ktype ) {
		if ( $ktype['ID'] == $requested ) {
			$cl = (string)$ktype->Checklist;
			
			die(json_encode(array(
									'name' => (string)$ktype['Name'],
									'color' => (string)$ktype['Colour'],
									'phrases' => (string)$ktype->StartingPhrase,
									'description' => nl2br((string)$ktype->Description),
									'checklist' => nl2br($cl)
								)
							)
						);
			
		}
	}
	die(json_encode(array( 'error' => 'No knowledge type found' )));
}

function knbu_get_type($type_id, $post_id = false) {
	global $knbu_kbsets;
	$kbset = knbu_get_kbset_for_post($post_id);
	
	foreach ( $knbu_kbsets[$kbset]->KnowledgeTypeSet[0]->KnowledgeType as $ktype ) {
		if ( $ktype['ID'] == (string)$type_id ) {
			return $ktype;
		}
	}
	return false;
}
	
/**
 * Displays custom additions to comment editing form.
 *
 * Hooked into the comment_form action. If the current post's categories do not have
 * KB typesets mapped to them, returns without doing anything, so the normal comment
 * form is displayed. For KB enabled posts, adds cognitive scaffolding.
 *
 * @param int $post_ID  The post for which scaffolding should be displayed.
 */
function knbu_comment_form($post_ID) {
	global $knbu_kbsets,$post;
	$kbtype = knbu_get_kbset_for_post();
	if ( !$kbtype ) return;
?>
	<div id="knbu" style="display:none;">
		<div id="knbu_scaffold" style="display:none;">
			<p id="knbu_heading" class="ktype_heading">Knowledge type</p>
			<div id="knbu_checklist">Checklist</div>
			<div id="knbu_popup" style="display:none;"><h3 id="knbu_popup_heading">Knowledge type</h3><p id="knbu_popup_p">Description</p></div>
			<span id="knbu_selector2"><select id="knbu_ktype2">
				<?php foreach ( $knbu_kbsets[$kbtype]->KnowledgeTypeSet[0]->KnowledgeType as $ktype ) {
					echo '<option value="' . $ktype['ID'] . '">' . $ktype['Name'] . '</option>';
				} ?>
			</select></span>
			<input id="knbu_select2" type="button" value="Change"/>
		</div>
		<p id="knbu_init">
			<span id="knbu_selector">Select <select id="knbu_ktype">
				<option value="">knowledge type</option>
				<?php foreach ( $knbu_kbsets[$kbtype]->KnowledgeTypeSet[0]->KnowledgeType as $ktype ) {
					echo '<option value="' . $ktype['ID'] . '">' . $ktype['Name'] . '</option>';
				} ?>
				</select>
			</span>
			<input id="knbu_select" type="button" value="Add comment"/>
		</p>
		<input id="knbu_real_ktype" type="text" style="display:none;"" name="knbu_ktype" value=""/>
	</div>
<?php
}
	
function knbu_comment_template( $comment_template ) {
	global $post;
	$knbu = knbu_get_kbset_for_post($post->post_ID);
	if(!$knbu)
		return $comment_template;
		
	return __DIR__ . '/comments.php';
}

function knbu_comment_form_map($post_ID) {
	?>
	<div class="knbu-form">
	<input type="hidden" value="<?php echo admin_url('admin-ajax.php'); ?>" id="admin-ajax-url">
	<input type="hidden" value="<?php echo $post_ID; ?>" id="post-id">
	<input type="hidden" name="parent-comment" id="parent-comment-id">
	
	<?php if(is_user_logged_in()) { ?>
		<input type="hidden" value="1" id="current_user">
		<?php } else { ?>
		<input type="hidden" value="0" id="current_user">
		
		<p class="knbu-user-fields">
			<span>
				<label for="author">Name <span class="required">*</span></label>
				<input type="text" id="current_user_name" name="author">
			</span>
			<span>
				<label for="author">Email <span class="required">*</span></label>
				<input type="text" id="current_user_email" name="email">
			</span>
			<br style="clear:both">
		</p>
	<?php } ?>
	<p><label for="title">Knowledge type <span class="required">*</span></label>
		<?php echo knbu_get_knowledge_type_select(); ?>
	</p>
	<p class="knbu-checklist"></p>
	<p><label for="comment">Comment <span class="required">*</span></label>
		<textarea style="width: 95%" rows="8" name="comment"></textarea>
	</p>
	<p><label for="title">Main idea <?php if(get_option('knbu_main_title_required')) { echo '<span class="required">*</span>'; } ?></label>
		<input type="text" id="title" name="title" <?php if(get_option('knbu_main_title_required')) { echo 'class="required-field"'; } ?>>
	</p>
	<p><input type="submit" value="Post Comment" id="submit-reply" class="knbu-submit" name="submit"></p>
	</div>
	
	<?php
}
	
function knbu_get_knowledge_type_select() {
	global $knbu_kbsets;
	$value = '<select name="knbu_type" id="knbu-type-selector">
	<option disabled selected>Select knowledge type</option>';
	foreach($knbu_kbsets[knbu_get_kbset_for_post(get_the_ID())]->KnowledgeTypeSet->KnowledgeType as $type)
	$value .= '<option value="'.$type['ID'].'">'.$type['Name'].'</option>';
	$value .= '</select>';
	return $value;
}

function knbu_get_legends() {
	global $knbu_kbsets;
	
	foreach($knbu_kbsets[knbu_get_kbset_for_post(get_the_ID())]->KnowledgeTypeSet->KnowledgeType as $type) {
		$color = $type['Colour'];
		echo '<li><span class="color" style="background-color: '.$color.'"></span>'.$type['Name'].'</li>';
	}
}


function knbu_init_mapview() {
	//To do: Check category and post (?)
	define('KNBU_MAPVIEW', isset($_GET['map-view']));
}


function knbu_enqueue_scripts() {
	if(KNBU_MAPVIEW) {
		wp_register_script('knbu-map-script', plugins_url().'/knowledge-building/knbu-map-script.js', array( 'jquery', 'jquery-ui-core', 'jquery-ui-slider' ));
		wp_register_script('jquery-mousewheel', plugins_url().'/knowledge-building/jquery.mousewheel.js', array( 'jquery' ));
		wp_register_script('raphael-js', plugins_url().'/knowledge-building/raphael-min.js');
		
		wp_enqueue_script(array( 'raphael-js', 'knbu-map-script', 'jquery-mousewheel' ));
	}
}

function knbu_new_reply_ajax() {
	
	$time = current_time('mysql');
	$var = new StdClass();
	
	function validate($condition, $messageIfFail) {
		if($condition) {
			$var = new StdClass();
			$var->Message = $messageIfFail; 
			echo json_encode($var);
			die();
		}
	}
	
	validate(empty($_POST['comment_content']), 'Content field cannot be empty');
	validate(get_option('knbu_main_title_required') && empty($_POST['comment_title']), 'Main idea field cannot be empty');
	validate(empty($_POST['comment_knbu_type']) || $_POST['comment_knbu_type'] == 'Select type', 'Please select Knowledge type.');
	validate(!is_numeric($_POST['comment_post_ID']), 'There was an error.');
	
	if(!$_POST['comment_user']) {
		validate(strlen($_POST['comment_user_email']) == 0, 'User email field cannot be empty');
		validate(strlen($_POST['comment_user_name']) == 0, 'User name field cannot be empty');
	}
	
	$data = array(
		'comment_post_ID' => $_POST['comment_post_ID'],
		'comment_content' => $_POST['comment_content'],
		'comment_parent' => $_POST['comment_parent'],
		'comment_date' => $time,
		'comment_approved' => 1
	);
	
	if($_POST['comment_user']) {
		$i = wp_get_current_user();
		$var->user_id = $i->ID;
		$var->username = get_the_author_meta('display_name', $var->user_id);
		$var->user_email = get_the_author_meta('user_email', $var->user_id);
		$data['user_id'] = $var->user_id;
	}
	else {
		$var->user_email = $_POST['comment_user_email'];
		$var->username = $_POST['comment_user_name'];
		
		$data['comment_author_email'] = $var->user_email;
	}
	
	// Get map index
	// Basically just the node number
	$var->index = get_post_meta( $data['comment_post_ID'], 'knbu_map_index', true);
	update_post_meta( $data['comment_post_ID'], 'knbu_map_index', $var->index + 1 );
	
	
	$data['comment_author'] = $var->username;
	$id = wp_insert_comment($data);
	$var->content = $_POST['comment_content'];
	$var->comment_title = knbu_generate_title($_POST['comment_title'], $var->content);
	
	if($id) {
		$var->Success = true;
		$ktype = $_POST['comment_knbu_type'];
		$var->knbu = $ktype;
		
		update_comment_meta( $id, 'kbtype', $ktype ); 
		update_comment_meta( $id, 'knbu_map_comment_index', $var->index ); 
		update_comment_meta( $id, 'comment_title', $var->comment_title );
	}
	$var->avatar = knbu_get_avatar_url($var->user_email);
	$var->parent = $_POST['comment_parent'];
	$var->id = $id;
	$ktype = knbu_get_type( $_POST['comment_knbu_type'], $_POST['comment_post_ID'] );
	$var->color = (string)$ktype['Colour'];
	
	$var->date = get_comment_date(get_option('date_format'),$id);
	$var->timestamp = strtotime(get_comment_date('Y-m-d H:i:s', $id));
	echo json_encode($var);
	die();
}


function knbu_map_view_template($template) {
	if(isset($_GET['map-view'])) {
		return plugin_dir_path(__FILE__).'map.php';
	}
	return $template;
}

/* Get gravatar url of a user */
function knbu_get_avatar_url($email) {
	$a = md5( strtolower( trim( $email ) ) );
	return 'http://www.gravatar.com/avatar/'.$a.'?s=92&d=mm';
}
	
	

function knbu_save_node_position() {
	if(is_numeric($_POST['id'])) 
		update_comment_meta( $_POST['id'], 'node_position', $_POST['node_position'] );
	die();
}
		


/* The plugin was using a custom table for connect-type-linking. 
 * It was later replaced with comment meta data which was introduced in WP2.9 
 * The function exports data from old table to comment meta. */
function knbu_custom_table_to_comment_meta() {
	global $wpdb;
	$table_name = $wpdb->prefix . 'knowledgetypes';
	
	$rows = $wpdb->get_results("SELECT * FROM $table_name"); 
	$success = true;
	foreach($rows as $row) {
		if(!update_comment_meta($row->comment_id, 'kbtype', $row->kbtype)) 
			$success = false;
	}
	if(!$success)
		wp_die('Something went wrong. Original data has not been deleted.');
		
	$wpdb->query("RENAME TABLE ".$table_name." TO ".$table_name."_backup");
}

// Comment layout	
function knbu_comment($id, $args = false) {
	if(!$args) {
		$args = array( 
			'type' => '',
			'avatar_src' => '',
			'username' => '',
			'link_href' => '',
			'title' => '',
			'date' => '',
			'content' => ''
			);
	}
	
	?>
	<div class="message-header">
		<h4 class="message-type"><?php echo $args['type']; ?></h4>
		<img class="message-avatar" src="<?php echo $args['avatar_src']; ?>">
		<span class="message-username"><?php echo $args['username']; ?></span>
		<br />
		<a class="message-link" href="<?php echo $args['link_href']; ?>">#</a> <span class="message-title"><?php echo $args['title']; ?></span>
		<span class="message-date"><?php echo $args['date']; ?></span>
	</div>
	<div class="message-content-wrapper">
		<div class="message-content"><?php echo $args['content']; ?></div>
		<div style="clear:both"></div>
		<a class="reply-toggle knbu-form-link comment-reply-link" id="open-reply">Reply</a>
		<div id="reply-wrapper">
			<?php knbu_comment_form_map($id); ?>
		</div>
		<div style="clear:both"></div>
	</div><?php 
}

function knbu_generate_title($title, $message) {
	if(!empty($title)) return $title;
	
	$words = explode(' ', $message);
	$title = implode(' ', array_slice($words, 0, 3));
	$title = substr($title, 0, 70);
	
	// Remove these "special" characters from the end of string
	if(in_array(substr($title, -1), array( ',', '.', ' ', '!', '?' )))
	$title = substr($title, 0, -1);
	
	$title .= '...';
	
	return $title;
}
?>