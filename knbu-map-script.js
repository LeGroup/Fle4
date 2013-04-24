/* Knowledge Building Map View */

/* Start the module */
(function($) {

	var Canvas, ViewPort;
	/* Working values: Repulse 15000, Attract 0.001 */
	var C = { Radius: 17, RectWidth: 90, RectHeight:45, Stroke: 8, Repulse: 15000 * 50, Attract: 0.001, Ignore_distance: 800, RadiusIncreaseByUser: 30 }
	var mouseDown = false;
	var mousePos;
	var Nodes = [];
	var NodesWaiting = [];
	var KnowledgeTypes = [];
	var Origin;
	var KnBuLabels;
	var AuthorLabels;
	var nodeOpen = false;
	
	var RectSet, TextSet, PathSet;
	
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
	var nodeDragged;
	var tries = 0; 
	var totalStart = 0;
	var FirstNodeTime, LastNodeTime;
	var mouseDownStart = 0;

	var POST;
	
	
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
		Origin = { X: Width/2, Y: Height/2 };
		
		$(window).resize(function() {
			Width = $(window).width();
			Height = $(window).height();
			Canvas.setSize(Width, Height);
			OriginalViewPort = { x: ViewPort.X, y: ViewPort.Y, width: ViewPort.width, height: ViewPort.height }
			Origin = { X: Width/2, Y: Height/2 };
			//ViewPort = Canvas.setViewBox(0, 0, Width, Height);
		});
		
		for(var serverNode in NodesFromServer) 
		{ Nodes[NodesFromServer[serverNode].id] = new Node(NodesFromServer[serverNode]); }
		
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
		var attr = { "font-size": '20px', fill: 'white', "font-weight": "bold", "stroke": "rgba(0,0,0,0.1)", "stroke-width": 2 };
		
		
		KnBuLabels = Canvas.set();
		$('#legend > ul > li').each(function() {
			if($(this).text() != 'Unspecified') {
				var obj = Canvas.text(20, 20, $(this).text()).attr(attr);
				
				var v = Vector.Diag(500 + C.RadiusIncreaseByUser * $('#legend > ul > li').length, 360 * ($(this).index()/($('#legend > ul > li').length)));
				v.Add(Origin);
				obj.attr({ x: v.X, y: v.Y });
				
				KnBuLabels.push(obj);
				KnowledgeTypes.push({ 
					text: $(this).text(), 
					width: obj.node.getComputedTextLength(),
					object: obj.attr({ opacity: 0 })
				});
			}
		});
		
		
		$('body').
		mouseup(function(){ /* draggingNode = false; */ }).
		mouseleave(function() { releaseNode(); });
		//Pan and Zoom mouse functionality
		$('svg').
			mousedown(function(e) { 
				mouseDownStart = { time: Date.now(), position: { X: mousePos.x, Y: mousePos.y } };
				if(e.target.nodeName == 'svg') { 
					mouseDown = true; 
					mousePos = { x: e.pageX, y: e.pageY }; 
					Node.Close();
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
			
		//Text selection
		$("body").mouseup(messageSelection);
		
		/* Move connection lines before circles, so circles won't be under the lines. (Mouse events) */
		$('#raven > svg > path').insertBefore('#raven > svg > rect:first');
		
		$('#close').click(function() { Node.Close(); });
		
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
				NodesPerUser[Nodes[node].Username] = { c: 0 };
				Users.push(Nodes[node].Username);
			}
			
			NodesPerUser[Nodes[node].Username].c++;
		}
		
		AuthorLabels = Canvas.set();
		var t = 0;
		for(var user in NodesPerUser) {
			
			var v = Vector.Diag(500 + C.RadiusIncreaseByUser * Users.length, 360 * (t/Users.length));
			v.Add(Origin);
			
			var obj = Canvas.text(20, 20, user).attr(attr);
			obj.attr({ x: v.X, y: v.Y });
			
			NodesPerUser[user].width = obj.node.getComputedTextLength();
			
			AuthorLabels.push(obj);
			t++;
		}
		AuthorLabels.attr({ opacity: 0 });
		
		// Set grouping controls
		$('#grouping-discussion').click(function() { ChangeGrouping('discussion', this); });
		$('#grouping-byauthors').click(function() { ChangeGrouping('users', this); });
		$('#grouping-byknowledgetypes').click(function() { ChangeGrouping('knowledgetypes', this); });
		$('#grouping-time').click(function() { ChangeGrouping('time', this); });
		
		$('#raven > svg > path').insertBefore('#raven > svg > rect:first');
		
		// Trigger node position calculations
		ResetNodeUpdating();
		
		// Auto-open node
		OpenLinkedNode();
	}
	
	var NavigationButtons = { Left: false, Right: false, Up: false, Down: false };
	var PanInterval;

	function ChangeGrouping(grouping, element) {
		$('#grouping > ul > li > a').css({ fontWeight: 'normal' });
		$(element).css({ fontWeight: 'bolder' });
		Grouping = grouping;
		
		if(grouping == 'knowledgetypes') 
			KnBuLabels.show().animate({ opacity: 1.0 }, 500, 'linear');
		else
			KnBuLabels.animate({ opacity: 0.0 }, 500, 'linear', function() { KnBuLabels.hide(); });
			
		if(grouping == 'users') 
			AuthorLabels.show().animate({ opacity: 1.0 }, 500, 'linear');
		else
			AuthorLabels.animate({ opacity: 0.0 }, 500, 'linear', function() { AuthorLabels.hide(); });
		
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
	
	function messageSelection(e) {
		if(window.getSelection()) {
			var sel = window.getSelection();
			if(sel.anchorNode && $(sel.anchorNode.parentElement).hasClass('message-content')) {
				var string = sel.anchorNode.data.substring(sel.extentOffset, sel.baseOffset); 
				if(string != '') {
					//console.log(string);
				}
			}
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
	
	function CalculatePositions() {
		
		// Add nodes that are waiting to be added
		// Can't add in the middle of a loop
		for(var i = 0; i < NodesWaiting.length; i++)
			Nodes[NodesWaiting[i].ID] = NodesWaiting[i];
		
		// Move connections under circles.
		if(NodesWaiting.length > 0)		
			$('#raven > svg > path').insertBefore('#raven > svg > rect:first');
		
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
				repulsive.Add(RepulsiveMovement(iNode.position, jNode.position));
			}
				
			switch(Grouping) {
				case 'discussion': 
					// Node's parent pulls the node
					
					if(jNode.Anchor) {
						var v = AttractiveMovement(jNode.position, jNode.Anchor);
						repulsive.Multiply(0.1);
						v.Multiply(10);
						attractive.Add(v);
					} else {
						for(var parent in jNode.Parents) {
							attractive.Add(AttractiveMovement(jNode.position, Nodes[jNode.Parents[parent]].position));
						}
					}
				break;
				
				case 'knowledgetypes': 
					for(var t = 0; t < KnowledgeTypes.length; t++) {
						if(jNode.TypeName == KnowledgeTypes[t].text) {
							// -1 because of the Unspecified type which should contain only the starting post.
							attractive.Add(AttractiveMovement(jNode.position, Vector.Diag(500 + C.RadiusIncreaseByUser * KnowledgeTypes.length, 360 * (t/(KnowledgeTypes.length)))));
							
							for(var x = 0; x < KnowledgeTypes[t].width; x += 20) {
								var v = Vector.Diag(500 + C.RadiusIncreaseByUser * KnowledgeTypes.length, 360 * (t/(KnowledgeTypes.length)));
								v.X -= KnowledgeTypes[t].width/2 - x;
								var r = RepulsiveMovement(v, jNode.position);
								r.Multiply(0.1);
								repulsive.Add(r);
							}
							break;
						}
					}
				break;
				
				case 'users': 
					var t = 0;
					for(var user in NodesPerUser) {
						if(jNode.Username == user) {
							attractive.Add(AttractiveMovement(jNode.position, Vector.Diag(500 + C.RadiusIncreaseByUser * Users.length, 360 * (t/(Users.length)))));
				
							
							for(var x = 0; x < NodesPerUser[user].width; x += 20) {
								var v = Vector.Diag(500 + C.RadiusIncreaseByUser * Users.length, 360 * (t/(Users.length)));
								v.X -= NodesPerUser[user].width/2 - x;
								var r = RepulsiveMovement(v, jNode.position);
								r.Multiply(0.1);
								repulsive.Add(r);
							}
							
							break;
						}
						t++;
					}
				break;
				
				case 'time': 
					var v = new Vector(timebar * ((jNode.Timestamp - FirstNodeTime) / timespan), 0);
					
					attractive.Add(AttractiveMovement(jNode.position, v));
					//repulsive.X *= 0.01;
					repulsive.Multiply(0.1);
					attractive.Y *= 0.1;
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
				
			//$('#fps').text(Date.now() - totalStart);
		}
	}

	function RepulsiveMovement(node1Pos, node2Pos) {
		
		var dist = Vector.DistanceSquared(node1Pos, node2Pos);
		if(dist > C.Ignore_distance * C.Ignore_distance) return new Vector(0, 0);
		
		var v = Vector.Subtract(node1Pos, node2Pos);
		v.Normalize();
		
		if(v.LengthSquared() == 0) {
			v.Add(Vector.Diag(10, Math.random() * 360));
			dist = v.LengthSquared();
		}
		
		var pulse = -C.Repulse;
		if(Grouping == 'users' || Grouping == 'knowledgetypes')
			pulse *= 0.3;
		
		v.Multiply(pulse / dist);
		
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
		
		if(args.anchor)
			this.position = { X: args.anchor.X, Y: args.anchor.Y };
		else if(args.id == 0)
			this.position = new Vector(0, 0);
		else
			this.position = new Vector(Math.random() * 2 - 1, Math.random() * 2 - 1);
			
		this.Radius = C.Radius;
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
		this.Static = args.static;

		if(args.anchor && args.anchor.X && args.anchor.Y) 
			this.Anchor = { X: args.anchor.X, Y: args.anchor.Y };
		
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
			
	
		}
		
		this.ReleaseAnchor = function() {
			releaseNode(node);	
			ResetNodeUpdating();
			
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
				
			if(node.Anchor) 
				node.ShowPin();
			else
				node.HidePin();
				
			//node.SVG.Circle.ID = node.ID;
			
			/* Drag'n drop */
			function move(dx, dy) { 
				if(node.Static) return;
				draggingNode = true;
				nodeDragged = node.ID;
				node.ChangePosition({ x: node.originalpos.x + dx * scale - Origin.X, y: node.originalpos.y + dy * scale - Origin.Y }); 
				ResetNodeUpdating();
			}
			
			function stopdrag(e) { 
				node.dragged = false;
				if(!draggingNode) return;
				
				draggingNode = false;
				
				saveNodePosition(node, { X: node.SVG.Rect.attr('x') + node.SVG.Rect.attr('width')/2, Y: node.SVG.Rect.attr('y') + node.SVG.Rect.attr('height')/2 });
				node.Positions.splice(0, node.Positions.length);
				ResetNodeUpdating(); 
			}
			
			function startdrag() {
				node.dragged = true;
				node.originalpos = { x: node.SVG.Rect.attrs.x + node.SVG.Rect.attr('width')/2, y: node.SVG.Rect.attrs.y + node.SVG.Rect.attr('height')/2 };
			}
			
			this.initDrag = function() {
				node.SVG.Set.drag(move, startdrag, stopdrag);
			}
			
			this.initDrag();
			
			/* Addtional parents disabled 
			node.SVG.Circle.onDragOver(function(element) {
				if(node.Static) return;
				if(element.type != 'circle') return;
				node.AddParent(Nodes[element.ID]);
			});
			*/
			
			node.SVG.Set.mouseover(function() {
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
			node.SVG.Set.click(function(e) {
				if(e.target.nodeName == 'image') return;
				if(draggingNode) return;
				if(Vector.DistanceSquared(mouseDownStart.position, { X: mousePos.x, Y: mousePos.y }) > 10 * 10 ) 
					return;
				if(!nodeOpen || SelectedNode != node)
					Node.Open(node);
				else
					Node.Close();
			});
			
			node.SVG.Pin.click(this.ReleaseAnchor);
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
			var realPos = new Vector(this.position.X + Origin.X, this.position.Y + Origin.Y);
			if(this.SVG.Connections) {
				for(var i = 0; i < this.Parents.length; i++) {
					this.SVG.Connections[this.Parents[i]].attr({ path:'M' + realPos.X + ',' + realPos.Y + 'L' + (Nodes[this.Parents[i]].position.X + Origin.X) + ',' + (Nodes[this.Parents[i]].position.Y + Origin.Y) });
				}
				for(var i = 0; i < this.Children.length; i++) {	
					Nodes[this.Children[i]].SVG.Connections[this.ID].attr({ path:'M' + realPos.X + ',' + realPos.Y + 'L' + (Nodes[this.Children[i]].position.X + Origin.X) + ',' + (Nodes[this.Children[i]].position.Y + Origin.Y) });
				}
			}
		}
		this.UpdatePosition = function() {
			var realPos = new Vector(this.position.X + Origin.X, this.position.Y + Origin.Y);
			
			this.SVG.Rect.attr({ x: realPos.X - this.SVG.Text.data('width')/2 - 15, y: realPos.Y - this.SVG.Text.data('height')/2 - 10 });
			this.SVG.Text.attr({ x: realPos.X - this.SVG.Text.data('width')/2, y: realPos.Y });
			this.SVG.Pin.attr({ x: realPos.X - this.SVG.Pin.getBBox().width/2, y: realPos.Y -  43});
			
			this.UpdateConnections();
		}
		
		this.ShowPin = function() {
			this.SVG.Pin.show();
		}
		
		this.HidePin = function() {
			this.SVG.Pin.hide();
		}
		
		this.InitSVG();
	}
	
	
	function releaseNode(node) {
		if(!node) {
			if(!draggingNode) return;
			else node = Nodes[nodeDragged];
		}
		
		node.SVG.Set.undrag();
		node.initDrag();
		node.Anchor = false;
		//draggingNode = false;
		node.dragged = false;
		node.Positions.splice(0, node.Positions.length);
		
		saveNodePosition(node, false);
		
		node = false;
	}
	
	Node.Open = function(node) {
		//Shrink the old selected node to its normal size
		//if(SelectedNode)
		//SelectedNode.SVG.Circle.animate({ r: C.Radius }, 200);
		node.SVG.Rect.attr({ "stroke": "#62abfd", "stroke-width": 3 });
		
		if(SelectedNode)	
			SelectedNode.SVG.Rect.attr({ "stroke-width": 0 });
			
		nodeOpen = true;
		
		//Select the selected node
		SelectedNode = node;
		//SelectedNode.SVG.Circle.animate({ r: C.Radius * 1.5 }, 200);
		
		$('#parent-comment-id').val(SelectedNode.ID);
		
		//Set message data
		var msg = $('#message');
		msg.hide().find('.message-content').html(node.Content);
		msg.find('.message-type').html(node.TypeName);
		msg.find('.message-avatar').attr({ src: node.Avatar });
		msg.find('.message-username').text(node.Username);
		msg.find('.message-date').text(node.Date);
		msg.find('.message-title').text(node.Title);
		msg.find('#message-link').attr({ 'href': '#' + node.ID }).text('#'+node.ID);
		
		//Get SVG element position relative to HTML document
		var bounds = Node.getDocumentPosition(node);
		
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
		
		msg.css({ backgroundColor: node.Color });
		
		
		msg.show(200);
	}
	
	Node.Close = function(callback) {
		
	
		nodeOpen = false;
		$('#message').hide(0, function() {
				if(callback)
					callback();
			});
		
	}
	
	Node.getDocumentPosition = function(node) {
		return node.SVG.Set[0].node.getBoundingClientRect(); 
	}
	
	Node.Add = function(x, y, Radius, parents, color, id, title, user, date) {
		var ret = {};
		if(!color) { color = '#fff'; }
		
		if(title.length > 20) { 
			var arr = title.split(' ');
			arr[Math.floor(arr.length/2)] += '\n';
			title = arr.join(' ');
			title = title.replace('\n ', '\n');
		}
		
		ret.Text = Canvas.text(x, y - 7, '#'+id + ' ' + user + '\n' + date + ' \n' + title);
		ret.Text.attr({ fill: '#000', 'text-anchor': 'start', 'font-size': '8px' });
		var box = ret.Text.getBBox();
		
		var rect = Canvas.rect(x - box.width/2, y - box.height/2, box.width + 30, box.height + 20);
		rect.attr('fill', color);
		rect.data('node-id', id);
		ret.Rect = rect;
		ret.Text.attr({ x: 0 });
		ret.Text.data('width', box.width);
		ret.Text.data('height', box.height);
		
		ret.Set = Canvas.set();
		ret.Set.push(ret.Text);
		ret.Set.push(ret.Rect);
		var img = Canvas.image('wp-content/plugins/knowledge-building/images/pin.png', 100, 100, 17 * 0.7, 30 * 0.7);
		img.data('not-open-node');
		ret.Set.push(img);
		ret.Pin = img;
		
		rect.insertBefore(ret.Text);
		ret.Connections = [];
		
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
			comment_content: $('textarea[name="comment"]:first').val(),
			comment_parent: $('#parent-comment-id').val(),
			comment_title: $('#title').val(),
			comment_user: parseInt($('#current_user').val()),
			comment_user_name: $('#current_user_name').val(),
			comment_user_email: $('#current_user_email').val(),
			action: 'knbu_new_reply'
			}, function(response) {
				/* Response data comes in JSON format */
				try {
					response = JSON.parse(response);
				} catch(e) {
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
					Node.Close(function() {
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
				value: 0.7
			});
			
		Zoom(0.7);
		PanInterval = setInterval(panClick, 30);
		$('#arrow-left').mousedown(function() { NavigationButtons.Left = true; });
		$('#arrow-right').mousedown(function() { NavigationButtons.Right = true; });
		$('#arrow-up').mousedown(function() { NavigationButtons.Up = true; });
		$('#arrow-down').mousedown(function() { NavigationButtons.Down = true; });
		$('#arrow-center').mousedown(ResetCanvasPosition);
		$(window).mouseup(function() { NavigationButtons = {} }).mouseleave(function() { NavigationButtons = {} });
	}
	
	function saveNodePosition(node, e) {
		if(node.Static) return; 
		
		e.X -= Origin.X;
		e.Y -= Origin.Y;
		
		if(e) {
			node.Anchor = new Vector(e.X, e.Y);
			node.ShowPin();
		}
		else {
			node.Anchor = false;
			node.HidePin();
		}
			
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
	
	function OpenLinkedNode() {
		var anchor = window.location.hash.replace('#', '');
		
		if(!isNaN(anchor) && anchor != "") {
			Node.Open(Nodes[anchor]);
		}
	}
	
	/* Initialize module when document is ready */
	$(function() { Init(); });
	
}(jQuery));