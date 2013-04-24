
<p><?php knbu_list_comments(); ?></p>
<br>
<div id="respond">
	<h3 id="reply-title">Leave a Reply</h3>
	<form action="<?php echo site_url(); ?>/wp-comments-post.php">
	<p class="comment-notes">Your email address will not be published. Required fields are marked <span class="required">*</span></p>
	<p><?php knbu_comment_form_map(get_the_ID()); ?></p>
	</form>
</div>