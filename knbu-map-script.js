/* Knowledge Building Map View */

/* Start the module */
(function($) {

	var Canvas, ViewPort;
	/* Working values: Repulse 15000, Attract 0.001 */
	var C = { Radius: 14, Stroke: 8, Repulse: 15000 * 3, Attract: 0.001, Ignore_distance: 800 }
	var mouseDown = false;
	var mousePos;
	var Nodes = [];
	var NodesWaiting = [];
	var KnowledgeTypes = [];
	
	var NodeCount = 0;
	var NodesPerKnowledgeType = [];
	var NodesPerUser = [];
	var Users = [];
	
	// 'discussion', 'users', 'knowledgetypes'
	var Grouping = 'discussion';
	
	var panMovement = new Vector(0, 0);
	var requestPositionsCalculating = false;
	var calculating = false;
	var Widht, Height;
	var OriginalViewPort = { width: 0, height: 0 }
	var AnimateNodeMovement = false;
	var submitted = false;
	var draggingNode = false;
	var tries = 0; 
	var totalStart = 0;
	var FirstNodeTime, LastNodeTime;
	var mouseDownStart = 0;

	var POST;
	/* If the browser doesn't support javascript console */
	if(!console)
		console = { log: function(s) { } }
	else if(!console.log)
		console.log = function(s) { }
	
	/* Run when document is ready */
	function Init() {
		//Get post ID
		POST = $('#post-id').val();
		
		// Initialize SVG Canvas
		Width = $(window).width();
		Height = $(window).height();
		Canvas = Raphael('raven', Width, Height);
		Canvas.setViewBox(0, 0, Width, Height);
		ViewPort = Canvas.setViewBox(0, 0, Width, Height);
		ViewPort.X = 0;
		ViewPort.Y = 0;
		OriginalViewPort = { x: ViewPort.X, y: ViewPort.Y, width: ViewPort.width, height: ViewPort.height }
		
		//Add the first element
		var main = new Node({
			id: 0, 
			position: new Vector(Width/2, Height/2), 
			radius: C.Radius * 1.5, 
			parent: false, 
			content: $('#data').attr('data-content'),
			level: 0,
			avatar: $('#data').attr('data-avatar'),
			username: $('#data').attr('data-username'),
			date: $('#data').attr('data-date'),
			typeName: 'Start',
			title: $('#data').attr('data-title'),
			timestamp: $('#data').attr('data-timestamp')
		});
		
		Nodes[0] = main;
		//And make its position static
		main.Static = true;
		//Loop through the list
		IterateChildren($('#data'), 1, main);
		
		
		for(var i in Nodes) { 
			Nodes[i].SetParents();
			
			//Get timestamps for the first and the last nodes
			//Used for sorting nodes by time
			if(!FirstNodeTime)
				FirstNodeTime = Nodes[i].Timestamp;
			else if(FirstNodeTime > Nodes[i].Timestamp)
				FirstNodeTime = Nodes[i].Timestamp;
				
			if(!LastNodeTime)
				LastNodeTime = Nodes[i].Timestamp;
			else if(LastNodeTime < Nodes[i].Timestamp)
				LastNodeTime = Nodes[i].Timestamp;
				
			NodeCount++;
		}
		
		$('#legend > ul > li').each(function() {
			KnowledgeTypes.push($(this).text());
		});
		
		$('body').mouseup(function(){ draggingNode = false; });
		//Pan and Zoom mouse functionality
		$('svg').
			mousedown(function(e) { 
				mouseDownStart = { time: Date.now(), position: { X: mousePos.x, Y: mousePos.y } };
				if(e.target.nodeName == 'svg') { 
					mouseDown = true; 
					mousePos = { x: e.pageX, y: e.pageY }; 
					$('#message').hide(0);  
				}
			}).
			mouseup(function(e) { 
				if(mouseDown){ mouseDown = false; MoveCanvas(); }
			}).
			mouseleave(function(e) { 
				if(mouseDown) { mouseDown = false; MoveCanvas(); }
			}).
			mousemove(function(e) {
				if(mouseDown) {
					Pan(e.pageX - mousePos.x, e.pageY - mousePos.y);
					panMovement = new Vector(e.pageX - mousePos.x, e.pageY - mousePos.y);
				}
				mousePos = { x: e.pageX, y: e.pageY };
			}).
			mousewheel(function(e, delta) { 
				e.preventDefault(); 
				$('#zoom').slider('value', $('#zoom').slider('value') + delta * $('#zoom').slider('option', 'step')); 
			});
			
		
		/* Move connection lines before circles, so circles won't be under the lines. (Mouse events) */
		$('#raven > svg > path').insertBefore('#raven > svg > circle:first');
		
		$('#close').click(function() { $('#message').hide(200); });
		
		// Reply click events
		$('#submit-reply').click(Reply);
		$('#open-reply').click(ToggleReply);
		
		// Set up canvas zooming and panning event listeners
		InitNavigation();
		
		// Node calculations
		totalStart = Date.now();
		
		// Count nodes per knowledgetypes and users
		// Used in grouping
		for(var node in Nodes) {
			if(!NodesPerKnowledgeType[Nodes[node].TypeName])
				NodesPerKnowledgeType[Nodes[node].TypeName] = 0;
			
			NodesPerKnowledgeType[Nodes[i].TypeName]++;
			
			if(!NodesPerUser[Nodes[node].Username]) {
				NodesPerUser[Nodes[node].Username] = 0;
				Users.push(Nodes[node].Username);
			}
			
			NodesPerUser[Nodes[node].Username]++;
		}
		
		// Set grouping controls
		$('#grouping-discussion').click(function() { ChangeGrouping('discussion', this); });
		$('#grouping-byauthors').click(function() { ChangeGrouping('users', this); });
		$('#grouping-byknowledgetypes').click(function() { ChangeGrouping('knowledgetypes', this); });
		$('#grouping-time').click(function() { ChangeGrouping('time', this); });
		
		// Trigger node position calculations
		ResetNodeUpdating();
	}
	
	var NavigationButtons = { Left: false, Right: false, Up: false, Down: false };
	var PanInterval;

	function ChangeGrouping(grouping, element) {
		$('#grouping > ul > li > a').css({ fontWeight: 'normal' });
		$(element).css({ fontWeight: 'bolder' });
		Grouping = grouping;
		
		if(Grouping != 'discussion') 
			FadeConnections(0);
		else 
			FadeConnections(1);
		
		ResetNodeUpdating();
	}
	
	function FadeConnections(opacity) {
		for(var node in Nodes) {
			if(!Nodes[node].SVG.Connections) continue;
			for(var connection in Nodes[node].SVG.Connections) 
			Nodes[node].SVG.Connections[connection].animate({ opacity: opacity }, 400);
		}
	}
	
	function panClick() {
		var movement = new Vector(0, 0);
		if(NavigationButtons.Left)
			movement.Add(new Vector(20, 0));
		if(NavigationButtons.Right)
			movement.Add(new Vector(-20, 0));
		if(NavigationButtons.Up)
			movement.Add(new Vector(0, 20));
		if(NavigationButtons.Down)
			movement.Add(new Vector(0, -20));
		
		Pan(movement.X, movement.Y);
	}

	function panRelease() { 
		if(true || PanInterval)
			clearInterval(PanInterval);
	}
	
	function StartNodeDrag(id) {
		if(draggingNode) return;
		
		draggingNode = true;
		
		function _drag() {
			
			Nodes[id].ChangePosition(mousePos);
			
			ResetNodeUpdating();
			
			if(draggingNode)
				setTimeout(_drag, 16);
		}
		
		setTimeout(_drag, 16);
	}
	
	function ResetNodeUpdating() {
		tries = 0;
		if(!calculating)
			CalculatePositions();
		else
			requestPositionsCalculating = true;
	}

	function AddNode(node) {
		node.SetParents();
		NodesWaiting.push(node);
		tries = 0;
		if(!calculating)
			CalculatePositions();
		else
			requestPositionsCalculating = true;
	}

	function IterateChildren(list, level, parent) {
		if(list.is('ul')) {
			list.children('li').each(function(i) {
				var childCount = list.children('li').size();
				if(parent)
					var angle = Vector.Angle(parent.position, Nodes[0].position) + 180;
				else
					var angle = 360/childCount * i;
					
				var pos = Vector.Diag(30, (15/childCount) * i - 15/2 + angle);
				pos.Add(parent.position);
				var main = new Node({
						id: $(this).attr('data-id'), 
						position: new Vector(pos.X, pos.Y), 
						radius: C.Radius, 
						parent: parent.ID, 
						content: $(this).attr('data-content'), 
						type: $(this).attr('data-kbtype'),
						typeName: $(this).attr('data-kbname'),
						avatar: $(this).attr('data-avatar'),
						username: $(this).attr('data-username'),
						date: $(this).attr('data-date'),
						timestamp: $(this).attr('data-timestamp'),
						additionalParents: $(this).attr('data-additional-parents'),
						color: $(this).attr('data-color'),
						level: level,
						title: $(this).attr('data-title'),
						anchor: { X: $(this).attr('data-anchor-x'), Y: $(this).attr('data-anchor-y') }
					});

				Nodes[$(this).attr('data-id')] = main;
				$(this).children('ul').each(function() { IterateChildren($(this), level + 1, main); });
			});
		}
	}

	function CalculatePositions() {
		
		// Add nodes that are waiting to be added
		// Can't add in the middle of a loop
		for(var i = 0; i < NodesWaiting.length; i++)
			Nodes[NodesWaiting[i].ID] = NodesWaiting[i];
			
		// Move connections under circles.
		if(NodesWaiting.length > 0)
			$('#raven > svg > path').insertBefore('#raven > svg > circle:first');
		
		NodesWaiting = [];
		requestPositionsCalculating = false;
		calculating = true;
		
		var moved = false;
		var repulsive = new Vector();
		var attractive = new Vector();
		
		var nodePos = [];
		for(var n in Nodes) { nodePos[n] = Nodes[n].position; }
		
		var timespan = LastNodeTime - FirstNodeTime;
		var timebar = timespan/60/60 * 5;
		
		for(var j in Nodes) {
			var jNode = Nodes[j];
			if(jNode.Static)
				continue;
				
			if(jNode.dragged)
				continue;
			
			repulsive.X = 0; repulsive.Y = 0;
			attractive.X = 0; attractive.Y = 0;
		
		
			for(var i in Nodes) {
				var iNode = Nodes[i];
				
				
				//Obviously we don't have to calculate forces "between" the same node.
				if(i == j) continue;
				if(Grouping == 'discussion' && !jNode.Anchor) {
					//If the node is the another node's child calculate attractive force (child pulls its parent)
					for(var parent in iNode.Parents) {
						if(iNode.Parents[parent] == jNode.ID) {
							attractive.Add(AttractiveMovement(jNode.position, iNode.position));
						}
					}
				}
				
				//Repulsive force
				repulsive.Add(RepulsiveMovement(iNode, jNode));
			}
				
			switch(Grouping) {
				case 'discussion': 
					// Node's parent pulls the node
					
					if(jNode.Anchor) {
						var v = AttractiveMovement(jNode.position, jNode.Anchor);
						attractive.Add(v);
					} else {
						for(var parent in jNode.Parents) {
							attractive.Add(AttractiveMovement(jNode.position, Nodes[jNode.Parents[parent]].position));
						}
					}
				break;
				
				case 'knowledgetypes': 
					for(var t = 0; t < KnowledgeTypes.length; t++) {
						if(jNode.TypeName == KnowledgeTypes[t]) {
							var v = new Vector(Width/2, Height/2);
							
							// -1 because of the Unspecified type which should contain only the starting post.
							v.Add(Vector.Diag(500, 360 * (t/(KnowledgeTypes.length - 1))));
							attractive.Add(AttractiveMovement(jNode.position, v));
							break;
						}
					}
				break;
				
				case 'users': 
					var t = 0;
					for(var user in NodesPerUser) {
						if(jNode.Username == user) {
							var v = new Vector(Width/2, Height/2);
							
							v.Add(Vector.Diag(500, 360 * (t/(Users.length))));
							attractive.Add(AttractiveMovement(jNode.position, v));
							break;
						}
						t++;
					}
				break;
				
				case 'time': 
					var v = new Vector(Width/2 - timebar * (1 - (jNode.Timestamp - FirstNodeTime) / timespan) + timebar/2, Height/2);
					
					attractive.Add(AttractiveMovement(jNode.position, v));
					//repulsive.X *= 0.01;
					repulsive.Multiply(0.1);
					attractive.Y *= 0.01;
				break;
			}
			
			// The total forces
			var v = Vector.Add(attractive, repulsive);
			var len = v.LengthSquared();
			// Limit the maximum movement (otherwise causes bugs)
			if(len > 150 * 150) 
				v.Clamp(150);
			
			if(len > 0.3) { //If movement is small enough, no need to calculate forces again
				moved = true;
				
				// Apply movement
				// Second attribute is to how often the nodes will be drawn (true = draw, false = don't draw)
				//v.Multiply(0.01);
				jNode.Move(v, false);
			}
		}
		
		for(var i in Nodes) {
			Nodes[i].UpdatePosition();
		}
		
		tries++;
		if((moved && tries < 1000) || requestPositionsCalculating)
			setTimeout(CalculatePositions, 10);
		else {
			calculating = false;
			
			//for(var i = 0; i < Nodes.length; i++) 
				//Nodes[i].UpdatePosition();
				
			$('#fps').text(Date.now() - totalStart);
		}
	}

	function RepulsiveMovement(node1, node2) {
		
		var dist = Vector.DistanceSquared(node1.position, node2.position);
		if(dist > C.Ignore_distance * C.Ignore_distance) return new Vector(0, 0);
		
		var v = Vector.Subtract(node1.position, node2.position);
		v.Normalize();
		
		if(v.LengthSquared() == 0) {
			v.Add(Vector.Diag(10, Math.random() * 360));
			dist = v.LengthSquared();
		}
		v.Multiply(-C.Repulse / dist);
		
		return v;
	}

	function AttractiveMovement(node1Pos, node2Pos) {
		
		// Attractive force
		
		var v = Vector.Subtract(node1Pos, node2Pos);
		v.Normalize();
		var dist = Vector.DistanceSquared(node1Pos, node2Pos);
		
		if(dist === 0) {
			v.Add(Vector.Diag(2, Math.random() * 360));
			dist = v.LengthSquared();
		}
		
		v.Multiply(-dist * C.Attract);
		return v;
	}
	var SelectedNode;
	function Node(args) {
		if(!args.typeName)
			args.typeName = 'Unspecified';
		
		this.Avatar = args.avatar;
		this.Username = args.username;
		this.ID = args.id;
		this.Date = args.date;
		this.parent = parseInt(args.parent);
		this.position = args.position;
		this.Radius = args.radius;
		this.Color = args.color;
		this.TypeName = args.typeName;
		this.Content = args.content;
		this.level = args.level;
		this.Title = args.title;
		this.Parents = [];
		this.Children = [];
		this.Timestamp = args.timestamp;
		this.movement = new Vector(0, 0);
		this.Positions = [];
		console.log(args.anchor);
		if(args.anchor && args.anchor.X && args.anchor.Y) 
			this.Anchor = args.anchor;
		
		var node = this;
		
		/* Parents and childs must be set after all node objects have been defined */
		this.SetParents = function() {
			var _parents = [parseInt(args.parent)];
			if(args.additionalParents)
				_parents = _parents.concat(args.additionalParents.split(','));
				
			for(var _parent in _parents) {
				this.AddParent(Nodes[_parents[_parent]]);
			}
		}
		
		this.AddParent = function(parent) {
			if(!parent) return;
			if($.inArray(parent.ID, this.Parents) >= 0) return;
			
			this.Parents.push(parent.ID);
			parent.Children.push(this.ID);
			
			var path = Canvas.path('M' + this.position.X + ',' + this.position.Y + 'L' + parent.position.X + ',' + parent.position.Y);
			path.attr('stroke', 'rgb(160,160,160)');
			this.SVG.Connections[parent.ID] = path;
			
			/* Move connection lines before circles, so circles won't be under the lines. (Mouse events) */
			$('#raven > svg > path').insertBefore('#raven > svg > circle:first');
		}
		
		this.InitSVG = function() { 
		
			node.SVG = Node.Add(
				node.position.X, 
				node.position.Y, 
				node.Radius, 
				node.Parents, 
				node.Color, 
				node.ID, 
				node.Title,
				node.Username,
				node.Date
				); 
			node.SVG.Circle.ID = node.ID;
			/* Drag'n drop */
			function move(dx, dy) { 
				if(node.Static) return;
				
				node.ChangePosition({ x: node.originalpos.x + dx * scale, y: node.originalpos.y + dy * scale }); 
				ResetNodeUpdating();
			}
			
			function stopdrag(e) { 
				node.dragged = false;
				
				saveNodePosition(node, { X: node.SVG.Circle.attr('cx'), Y: node.SVG.Circle.attr('cy') });
				node.Positions.splice(0, node.Positions.length);
				ResetNodeUpdating(); 
			}
			
			function startdrag() {
				node.dragged = true;
				node.originalpos = { x: node.SVG.Circle.attrs.cx, y: node.SVG.Circle.attrs.cy };
			}
			
			node.SVG.Circle.drag(move, startdrag, stopdrag);
			
			/* Addtional parents disabled 
			node.SVG.Circle.onDragOver(function(element) {
				if(node.Static) return;
				if(element.type != 'circle') return;
				node.AddParent(Nodes[element.ID]);
			});
			*/
			
			node.SVG.Circle.mouseover(function() {
				if(Grouping != 'discussion') {
					FadeConnections(0);
					for(var c in node.SVG.Connections) {
						var connection = node.SVG.Connections[c];
						connection.animate({ opacity: 1 }, 400);
					}
					for(var p in node.Children) {
						Nodes[node.Children[p]].SVG.Connections[node.ID].animate({ opacity: 1 }, 400);
					}
				}
				
			});
			
			
			/* Click events */
			node.SVG.Circle.click(function(e) {
				if(Vector.DistanceSquared(mouseDownStart.position, { X: mousePos.x, Y: mousePos.y }) > 10 * 10 ) 
					return;
				
				
				//Shrink the old selected node to its normal size
				if(SelectedNode)
					SelectedNode.SVG.Circle.animate({ r: C.Radius }, 200);
				
				
				//Select the selected node
				SelectedNode = node;
				SelectedNode.SVG.Circle.animate({ r: C.Radius * 1.5 }, 200);
				
				$('#parent-comment-id').val(SelectedNode.ID);
			
				//Set message data
				var msg = $('#message');
				msg.hide().find('.message-content').text(node.Content);
				msg.find('.message-type').html(node.TypeName);
				msg.find('.message-avatar').css({ backgroundImage: 'url(' + node.Avatar + ')' });
				msg.find('.message-username').text(node.Username);
				msg.find('.message-coords').text();
				msg.find('.message-date').text(node.Date);
				
				//Get SVG element position relative to HTML document
				var bounds = node.SVG.Circle.node.getBoundingClientRect();
				
				//Position the message box
				var top, left;
				if(bounds.left < Width/ 2)
					left = bounds.right + 10; 
				else
					left = bounds.left - msg.width() - 10;
					
			
				top = bounds.top + 10 - msg.height();
					
				if(left + msg.width() > Width)
					left = Width - 50 - msg.width();
				if(left < 0)
					left = 10;
				if(top + msg.height() > Height)
					top = Height - 50 - msg.height();
				if(top < 0)
					top = 10;
					
				msg.css({ top: top, left: left });
				
				msg.find('.message-header').css({ backgroundColor: node.Color });
				
				
				msg.show(200);
			});
		}
		
		this.Move = function(acceleration, update) {
			this.movement.Add(acceleration);
			this.Positions.push(Vector.Add(this.position, this.movement));
			
			while(this.Positions.length > 4)
			{ this.Positions.shift(); }
			
			var sumX = 0, sumY = 0;
			for(var pos in this.Positions) {
				sumX += this.Positions[pos].X;
				sumY += this.Positions[pos].Y;
			}
			
			this.position.X = sumX / this.Positions.length;
			this.position.Y = sumY / this.Positions.length;
			
			//this.position.X += this.movement.X;
			//this.position.Y += this.movement.Y;
			this.movement.Multiply(0.0);
			if(update)
				this.UpdatePosition();
		}
		
		this.ChangePosition = function(newPos) {
			
			this.position.X = newPos.x;
			this.position.Y = newPos.y;
			this.UpdatePosition();
		}
		
		this.UpdateConnections = function() {
			if(this.SVG.Connections) {
				for(var i = 0; i < this.Parents.length; i++) {
					//if(!Nodes[this.Parents[i]]) { console.log("Parent doesn't exists!"); continue; }
					this.SVG.Connections[this.Parents[i]].attr({ path:'M' + this.position.X + ',' + this.position.Y + 'L' + Nodes[this.Parents[i]].position.X + ',' + Nodes[this.Parents[i]].position.Y });
				}
				for(var i = 0; i < this.Children.length; i++) {	
					//if(!Nodes[this.Children[i]]) { console.log("Child doesn't exists!"); continue; }
					Nodes[this.Children[i]].SVG.Connections[this.ID].attr({ path:'M' + this.position.X + ',' + this.position.Y + 'L' + Nodes[this.Children[i]].position.X + ',' + Nodes[this.Children[i]].position.Y });
				}
			}
		}
		this.UpdatePosition = function() {
			
			this.SVG.Circle.attr({ cx: this.position.X, cy: this.position.Y });
			this.SVG.Text.attr({ x: this.position.X + C.Radius + 15, y: this.position.Y });
			//this.SVG.Date.attr({ x: this.position.X + C.Radius + 15, y: this.position.Y + 7 });
			this.UpdateConnections();
		}
		
		this.InitSVG();
	}
	

	Node.Add = function(x, y, Radius, parents, color, id, title, user, date) {
		var ret = {};
		
		var circle = Canvas.circle(x, y, Radius);
		circle.attr('fill', 'rgba(240, 240, 240, 1)');
		circle.attr('stroke', color);
		circle.attr('stroke-width', C.Stroke);
		circle.data('node-id', id); 
		ret.Circle = circle;
		ret.Connections = [];
		
		ret.Text = Canvas.text(x + C.Radius, y - 7, title + '\n' + date + ' \nby ' + user);
		ret.Text.attr({ fill: '#fff', stroke: 'rgba(0, 0, 0, 0.2)', 'text-anchor': 'start', 'font-size': '8px' });
		
		//ret.Date = Canvas.text(x + C.Radius, y + 7, date + ' by ' + user);
		//ret.Date.attr({ fill: 'rgba(255,255,255,0.7)', stroke: 'rgba(0, 0, 0, 0.2)', 'text-anchor': 'start', 'font-size': '10px' });
		return ret;
	}

	

	function Pan(x, y) {
		ViewPort.X -= x * scale;
		ViewPort.Y -= y * scale;
		Canvas.setViewBox(ViewPort.X, ViewPort.Y, ViewPort.width, ViewPort.height);
	}

	function ResetCanvasPosition() {
		var x = -(OriginalViewPort.width * scale - OriginalViewPort.width) / 2;
		var y = -(OriginalViewPort.height * scale - OriginalViewPort.height) / 2;
		
		function anim() {
			ViewPort.X = ViewPort.X - (ViewPort.X - x) * 0.5;
			ViewPort.Y = ViewPort.Y - (ViewPort.Y - y) * 0.5;
			Canvas.setViewBox(ViewPort.X, ViewPort.Y, ViewPort.width, ViewPort.height);
			
			if(Math.abs(ViewPort.X - x) < 10) {
				ViewPort.X = x;
				ViewPort.Y = y;
			}
			else
				setTimeout(anim, 16);
		}
		setTimeout(anim, 16);
	}

	function MoveCanvas() {
		panMovement.Multiply(0.85);
		Pan(panMovement.X, panMovement.Y);
		
		if(panMovement.LengthSquared() > 10 && !mouseDown)
			setTimeout(MoveCanvas, 16);
	}

	var scale = 1;
	function Zoom(z) {
		scale = z;
		
		if(scale < 0.25) {
			scale = 0.25;
		}
		if(scale > 4) {
			scale = 4;
		}
		
		ViewPort.X -= (OriginalViewPort.width * scale - ViewPort.width) / 2;
		ViewPort.Y -= (OriginalViewPort.height * scale - ViewPort.height) / 2;
		
		ViewPort.width = scale * OriginalViewPort.width;
		ViewPort.height = scale * OriginalViewPort.height;
		
		Canvas.setViewBox(ViewPort.X, ViewPort.Y, ViewPort.width, ViewPort.height);
		
	}

	function ToggleReply() { $('#reply-wrapper').toggle(200); }

	function Reply() {
		if(submitted)
			return;
		
		submitted = true;
		var url = $('#admin-ajax-url').val();
		var typename = $('select[name="knbu_type"] option[value="'+ $('select[name="knbu_type"]:first').val() + '"]').text();
		$.post(url, { 
			comment_post_ID: POST,
			comment_knbu_type: $('select[name="knbu_type"]:first').val(),
			comment_content: $('textarea[name="comment-content"]:first').val(),
			comment_parent: $('#parent-comment-id').val(),
			comment_title: $('#comment-title').val(),
			comment_user: parseInt($('#current_user').val()),
			comment_user_name: $('#current_user_name').val(),
			comment_user_email: $('#current_user_email').val(),
			action: 'knbu_new_reply'
			}, function(response) {
				/* Response data comes in JSON format */
				try {
					response = JSON.parse(response);
				} catch(e) {
					console.log(response); 
				}
				if(response.Success) {
					/* Add new node */
					/* At this point the comment has been saved to the server */
					var n = new Node({
						id: response.id, 
						position: new Vector(
							SelectedNode.position.X + Math.random() * 50, 
							SelectedNode.position.Y + Math.random() * 50), 
						radius: C.Radius, 
						parent: response.parent, 
						content: response.content, 
						type: response.knbu,
						typeName: typename,
						avatar: response.avatar,
						username: response.username,
						level: SelectedNode.level + 1,
						date: response.date,
						color: response.color,
						title: response.comment_title,
						timestamp: response.timestamp
					});
					AddNode(n);
					
					/* Reset reply form */
					$('#message').hide(200, function() {
						$('select[name="knbu_type"]:first option:first').attr('selected', true);
						$('textarea[name="comment-content"]:first').val('');
						ToggleReply();
						submitted = false;
					});
				}
				else if(response.Message) {
					submitted = false;
					alert(response.Message);
				}
				else {
					submitted = false;
					console.log('General error message');
				}
		});
	}

	function InitNavigation() {
		$('#zoom').slider({
				orientation: 'vertical',
				change: function(e, ui) { Zoom(ui.value); },
				slide: function(e, ui) {
					Zoom(ui.value);
				},
				max: 4,
				min: 0.25,
				step: 0.1,
				value: 1
			});
			
		
		PanInterval = setInterval(panClick, 30);
		$('#pan .left').mousedown(function() { NavigationButtons.Left = true; });
		$('#pan .right').mousedown(function() { NavigationButtons.Right = true; });
		$('#pan .up').mousedown(function() { NavigationButtons.Up = true; });
		$('#pan .down').mousedown(function() { NavigationButtons.Down = true; });
		$('#pan .center').mousedown(ResetCanvasPosition);
		$(window).mouseup(function() { NavigationButtons = {} }).mouseleave(function() { NavigationButtons = {} });
	}
	
	function saveNodePosition(node, e) {
		node.Anchor = new Vector(e.X, e.Y);
		var url = $('#admin-ajax-url').val();
		$.post(url, { 
			id: node.ID,
			node_position: JSON.stringify(e),
			action: 'knbu_save_node_position'
			}, function(response) {
				
			});
	}
	
	function Vector(x, y) {
		this.X = x; 
		this.Y = y;
		
		this.Length = function() { return Math.pow(Math.pow(this.X, 2) + Math.pow(this.Y, 2), 1/2); }
		this.LengthSquared = function() { return Math.pow(this.X, 2) + Math.pow(this.Y, 2); }
		this.Add = function(v2) { this.X += v2.X; this.Y += v2.Y; }
		this.Multiply = function(k) { this.X *= k; this.Y *= k; }
		this.Divide = function(k) { this.X /= k; this.Y /= k; }
		this.Normalize = function() { if(!(this.X == 0 && this.Y == 0)) { var len = this.Length();  this.X /= len; this.Y /= len; } }
		this.Clamp = function(m) { if(this.LengthSquared() > m * m) { this.Normalize(); this.Multiply(m); } }
		Vector.Angle = function(v1, v2) { return Math.atan2(v2.Y - v1.Y, v2.X - v1.X) * 180/Math.PI; }
		Vector.Add = function(v1, v2) { return new Vector(v1.X + v2.X, v1.Y + v2.Y); }
		Vector.Subtract = function(v1, v2) { return new Vector(v1.X - v2.X, v1.Y - v2.Y); }
		Vector.Multiply = function(v1, k) { return new Vector(v1.X * k, v1.Y * k); }
		Vector.Clamp = function(v, max) { 
			if(v.LengthSquared() > max * max) { v.Normalize(); v.Multiply(max); }
			return v;
		} 
		Vector.Diag = function(s, a) { return new Vector(s * Math.cos(a * Math.PI/180), s * Math.sin(a * Math.PI/180)); }
		Vector.DistanceSquared = function(v1, v2) {
			return Math.pow(v2.X - v1.X, 2) + Math.pow(v2.Y - v1.Y, 2);
		}
		Vector.Distance = function(v1, v2) { return Math.pow(Vector.DistanceSquared(v1, v2), 1/2); }
	}
	
	/* Initialize module when document is ready */
	$(function() { Init(); });
	
}(jQuery));