 ===
Contributors: tatti, spikefinned
Donate link: http://fle4.uiah.fi/
Tags: education, learning, knowledge building, progressive inquiry, comments, discussion, school
Requires at least: 2.7
Tested up to: 3.8
Stable tag: 0.7.1

Use comment threads to facilitate meaningful knowledge building discussions. Comes with several knowledge type sets (eg. progressive inquiry, six hat thinking) that can be used to semantically tag comments, turning your Wordpress into a knowledge building environment. Especially useful in educational settings.

== Description ==

Knowledge Building is a process of collaboratively building new understanding and knowledge through meaningful discussion. This plugin allows knowledge building processes to happen on Wordpress comments. There are several different knowledge typesets to choose from, and they can be mapped to individual post categories, so other posts will continue to use their normal commenting functionality, while some categories will be equipped with knowledge building tools.

This plugin is primarily meant for use in educational settings, but can of course be used for any meaningful purpose.

This plugin uses the JQuery javascript library, and the jquery.simpledialog plugin for JQuery to streamline the user interface. JQuery is used in noconflict-mode, so this won't disturb a Wordpress installation that uses another javascript library as its default.

For more regular updates see [GitHub](https://github.com/LeGroup/Fle4 "FLE4 GitHub page").

== Installation ==

This section describes how to install the plugin and get it working.

1. Store the plugin into the `/wp-content/plugins/knowledge-building/` directory (basically just unzip the contents of the file into /wp-content/plugins).
1. Activate the plugin through the 'Plugins' menu in Wordpress.
1. Go to Settings, Knowledge Building and select which post Categories should have Knowledge Building enabled.

Please note that since this plugin relies heavily on the commenting feature, not all themes will work nicely. Specifically, this plugin works best with themes that use the Wordpress built-in comment Walker. You can detect this by checking whether or not your comments.php template has a call to 'wp_list_comments' or not. If it does not, then it has its own custom way of showing comments, which this plugin cannot easily work with. You can either select another theme which uses Wordpress Walker, or just try and replace the code in comments.php that displays comments with a call to `knbu_list_comments();` and cross your fingers. :-)

== Frequently Asked Questions ==

= How should I set up my blog to best leverage KB? =

I'd suggest creating categories such as "Progressive Inquiry", "Six Hat Thinking" etc. to match the knowledge type sets that you want to use. If your blog will be used in several courses, then I suggest you also create a category for each course. Another good category would be "News". You can then create posts by combining several categories:

* Course1 + News: news about course 1
* Course1 + Progressive Inquiry: a knowledge building context for course 1, using progressive inquiry as the knowledge type set
* Course2 + Six Hat Thinking: a knowledge building context for course 2, using six hat thinking

This way it's easy for students to follow just the course they're interested in, and also to spot knowledge building contexts.

After you've set up the categories, go to Settings, Knowledge Building, and assign categories to available knowledge type sets. Note that if a post has several categories that are assigned to KB sets, things will become unpredictable.

In Settings, Discussion it's probably a good idea to enable threaded (nested) comments, so people can respond to individual comments, and not only at the end of the comments list. Also you might want to disable breaking of comments into pages (as sorting of comments will only sort comments on that one page).

For discussion moderation and other visibility settings, do what feels right. You can close off your entire blog from public view and require students to log in (maybe use an LDAP plugin to get login information from your school's systems), or keep the blog open - it's up to you. If you do know that only your students will have access to the commenting feature, you might want to disable the "automatically moderate if comment contains more than N links" setting.

= Where can I get more Knowledge Typesets? =

Go to http://fle3.uiah.fi/download.html to find typesets exported from Fle3. Basically you just need to download the zip file, open it, and take the 'fledom.xml' file, rename it something meaningful (like the name of the zip file you downloaded) while retaining the xml extension, and place the file into the kbsets folder of this plugin.

= How can I create new Knowledge Typesets? =

Either copy an existing typeset's XML file to a new name, and edit it to your liking, or use the online editor of Fle3 to create a new set, and export it into an XML file (see previous question).

== Screenshots ==

1. Demonstration of the progressive inquiry knowledge typeset in use on Wordpress.

== Changelog ==

=0.7.1=
* Deprecation error fixed.

=0.7=
* Map view ready and optimized.

=0.6=
* A new map view introduced.

=0.5.7=
* Tested to work with Wordpress 3.5.1
* IE bug fix

=0.5.4=
* Tested to work with Wordpress 3.0.

=0.5.3=
* Tested to work with Wordpress 2.9.

=0.5.2=
* Debug messages removed (broke sorting on IE).

=0.5.1=
* Speed optimization to comment sorting.

=0.5=
* Quick fix for database initialization
* Basic support for sorting of comments.

= 0.4 =
* Corrected path dependency to math the installation path given by the Wordpress Plugin Directory.
* Windows-compatible path handling.

= 0.3 =
* Modified colors to be less intensive.
* Otherwise everything seems to be working smoothly.

= 0.2 =
* Beta release. Main functionality is done, and seems to be working.

= 0.1 =
* Initial alpha version.

