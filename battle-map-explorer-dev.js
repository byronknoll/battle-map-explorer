/*
battle-map-explorer version 1.1

This code is released into the public domain - attribution is appreciated but not required.
Made by Byron Knoll.

https://github.com/byronknoll/battle-map-explorer

See example-map.html for an example of how to use this library.

This library is called using the "run" function:

BattleMapExplorer.run(image, position, polygons, doors);

image: string containing a path to the background image.
position: coordinate of the starting position. A coordinate is a list of two numbers: x position and y position.
polygons: a list of polygons. Each polygon is a list of coordinates.
doors: a list of line segments representing doors. A line segment is a list of two coordinates.
darkness: if true, visibility will be limited to a circular region.
*/

window.requestAnimFrame = (function() {
	return  window.requestAnimationFrame       || 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame     || 
		function(callback, element){
			window.setTimeout(callback, 1000 / 60);
		};
})();

function BattleMapExplorer(){};

BattleMapExplorer.run = function(image, position, polygons, doors, darkness) {
	darkness = typeof darkness !== 'undefined' ? darkness : true;
	var width = window.innerWidth;
	var height = window.innerHeight;
	canvas.getContext("2d").canvas.width  = width;
	canvas.getContext("2d").canvas.height = height;
	var update_needed = true;
	var num_doors = 0;
	var loaded = false;
	var observer_x = position[0];
	var observer_y = position[1];
	var left = false, right = false, up = false, down = false;
	var shiftKey = false;
	var stopMovement = false;
	var drag_start_x = 0, drag_start_y = 0, drag_diff_x = 0, drag_diff_y = 0;
	var speed = 5;
	var hammer = new Hammer(document.getElementById("canvas"));
	hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
	
	var img1 = new Image();
	var img1_loaded = false;
	img1.onload = function(){
		img1_loaded = true;
	};
	img1.src = image;

	requestAnimFrame(update);

	function setup() {
		var img_width = img1.width;
		var img_height = img1.height;
		polygons.push([[-1,-1],[img_width+1,-1],[img_width+1,img_height+1],[-1,img_height+1]]);
		segments = VisibilityPolygon.convertToSegments(polygons);
		segments = VisibilityPolygon.breakIntersections(segments);
		// doors:
		for (var i = 0; i < doors.length; ++i) {
			segments.push(doors[i]);
		}
		num_doors = doors.length;
	};

	window.onresize = function(event) {
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.getContext("2d").canvas.width  = width;
		canvas.getContext("2d").canvas.height = height;
		update_needed = true;
	};

	document.addEventListener('touchmove', function(e) {
		e.preventDefault();
	}, false);

	function upCode(key) {
		if (key == 87 || key == 38 || key == 104) return true;
		return false;
	};

	function leftCode(key) {
		if (key == 65 || key == 37 || key == 100) return true;
		return false;
	};

	function rightCode(key) {
		if (key == 68 || key == 39 || key == 102) return true;
		return false;
	};

	function downCode(key) {
		if (key == 83 || key == 40 || key == 98) return true;
		return false;
	};

	document.onkeydown=function(e){
		if (upCode(e.keyCode)) {
			up = true;
			update_needed = true;
		} else if (leftCode(e.keyCode)) {
			left = true;
			update_needed = true;
		} else if (rightCode(e.keyCode)) {
			right = true;
			update_needed = true;
		} else if (downCode(e.keyCode)) {
			down = true;
			update_needed = true;
		} else if (e.keyCode == 16) {
			shiftKey = true;
		}
	}

	document.onkeyup=function(e){
		if (upCode(e.keyCode)) {
			up = false;
			update_needed = true;
		} else if (leftCode(e.keyCode)) {
			left = false;
			update_needed = true;
		} else if (rightCode(e.keyCode)) {
			right = false;
			update_needed = true;
		} else if (downCode(e.keyCode)) {
			down = false;
			update_needed = true;
		} else if (e.keyCode == 32) {
			// Press "space" to get the current position.
			console.log("[" + Math.round(observer_x) + "," + Math.round(observer_y) + "],");
		} else if (e.keyCode == 191 || e.keyCode == 96) {
			// Press '/' to change speed.
			speed = Number(prompt("Enter movement speed:", speed));
		} else if (e.keyCode == 16) {
			// Hold down shift to take single steps.
			shiftKey = false;
		}
		stopMovement = false;
	}

	hammer.on('pan', function(e) {
		var x = e.center.x;
		var y = e.center.y;
		var diff_x = e.deltaX;
		var diff_y = e.deltaY;
		var start_x = x - diff_x;
		var start_y = y - diff_y;
		if (start_x != drag_start_x || start_y != drag_start_y) {
			drag_diff_x = 0;
			drag_diff_y = 0;
		}
		drag_start_x = start_x;
		drag_start_y = start_y;
		x = diff_x;
		y = diff_y;
		diff_x -= drag_diff_x;
		diff_y -= drag_diff_y;
		drag_diff_x = x;
		drag_diff_y = y;
		move(observer_x - diff_x, observer_y - diff_y);
	});

	function move(x, y) {
		// prevent wall jumping:
		for (var i = 0; i < segments.length - num_doors; ++i) {
			if (VisibilityPolygon.doLineSegmentsIntersect(observer_x, observer_y, x, y, segments[i][0][0], segments[i][0][1], segments[i][1][0], segments[i][1][1])) return;
		}
		observer_x = x;
		observer_y = y;
		update_needed = true;
	}

	function update() {
		var ctx = canvas.getContext("2d");
		if (!loaded) {
			if (img1_loaded) {
				loaded = true;
				setup();
			}
			ctx.save();
			requestAnimFrame(update);
			return;
		}
		if (!update_needed) {
			requestAnimFrame(update);
			return;
		}
		update_needed = false;

		updateMovement();

		var center_x = width/2;
		var center_y = height/2;
		var offset_x = center_x - observer_x;
		var offset_y = center_y - observer_y;
		var rad = Math.min(width, height)/2;

		ctx.restore();
		ctx.save();
		ctx.clearRect(0, 0, width, height);

		if (darkness) {
			clipDarkness(ctx, center_x, center_y, rad);
		}
		clipVisibility(ctx, offset_x, offset_y);
		renderBackground(ctx, center_x, center_y, rad);
		renderDoors(ctx, offset_x, offset_y);
		renderCrosshair(ctx, center_x, center_y);
		if (darkness) {
			shadeDarkness(ctx, center_x, center_y, rad);
		}

		requestAnimFrame(update);
	};

	function updateMovement() {
		if (!stopMovement) {
			if (left) {
				move(observer_x - speed, observer_y);
				update_needed = true;
			}
			if (right) {
				move(observer_x + speed, observer_y);
				update_needed = true;
			}
			if (up) {
				move(observer_x, observer_y - speed);
				update_needed = true;
			}
			if (down) {
				move(observer_x, observer_y + speed);
				update_needed = true;
			}
		}
		if (shiftKey && (left || right || up || down)) stopMovement = true;
	};

	function clipDarkness(ctx, center_x, center_y, rad) {
		ctx.beginPath();
		ctx.arc(center_x, center_y, rad, 0, Math.PI*2, true);
		ctx.clip();
	};

	function clipVisibility(ctx, offset_x, offset_y) {
		var poly = VisibilityPolygon.computeViewport([observer_x, observer_y], segments, [-offset_x, -offset_y], [width-offset_x, height-offset_y]);
		ctx.beginPath();
		ctx.moveTo(poly[0][0]+offset_x, poly[0][1]+offset_y);
		for (var i = 1; i < poly.length; ++i) {
			ctx.lineTo(poly[i][0]+offset_x, poly[i][1]+offset_y);
		}
		ctx.clip();
	};

	function renderBackground(ctx, center_x, center_y, rad) {
		var clip_x = observer_x - width/2;
		var clip_y = observer_y - height/2;
		var size_x = width;
		var size_y = height;
		var start_x = center_x - width/2;
		var start_y = center_y - height/2;
		if (darkness) {
			clip_x = observer_x - rad;
			clip_y = observer_y - rad;
			size_x = 2*rad;
			size_y = 2*rad;
			start_x = center_x - rad;
			start_y = center_y - rad;
		}
		if (clip_x < 0) {
			start_x -= clip_x;
			size_x += clip_x;
			clip_x = 0;
		}
		if (clip_y < 0) {
			start_y -= clip_y;
			size_y += clip_y;
			clip_y = 0;
		}
		if (clip_x + size_x >= img1.width) {
			size_x = img1.width - clip_x - 1;
		}
		if (clip_y + size_y >= img1.height) {
			size_y = img1.height - clip_y - 1;
		}
		ctx.drawImage(img1, clip_x, clip_y, size_x, size_y, start_x, start_y, size_x, size_y);
	};

	function renderDoors(ctx, offset_x, offset_y) {
		for (var i = segments.length - num_doors; i < segments.length; ++i) {
			ctx.beginPath();
			ctx.lineWidth=10;
			ctx.strokeStyle='black';
			ctx.moveTo(segments[i][0][0]+offset_x, segments[i][0][1]+offset_y);
			ctx.lineTo(segments[i][1][0]+offset_x, segments[i][1][1]+offset_y);
			ctx.stroke();
			ctx.beginPath();
			ctx.lineWidth=6;
			ctx.strokeStyle='white';
			ctx.moveTo(segments[i][0][0]+offset_x, segments[i][0][1]+offset_y);
			ctx.lineTo(segments[i][1][0]+offset_x, segments[i][1][1]+offset_y);
			ctx.stroke();
		}
	};

	function renderCrosshair(ctx, center_x, center_y) {
		ctx.beginPath();
		ctx.lineWidth=2;
		ctx.strokeStyle='black';
		ctx.fillStyle='white';
		ctx.fillRect(center_x-2,center_y-25,4,20);

		ctx.rect(center_x-2,center_y-25,4,20);
		ctx.stroke();
		ctx.fillRect(center_x-2,center_y+5,4,20);
		ctx.rect(center_x-2,center_y+5,4,20);
		ctx.stroke();
		ctx.fillRect(center_x-25,center_y-2,20,4);
		ctx.rect(center_x-25,center_y-2,20,4);
		ctx.stroke();
		ctx.fillRect(center_x+5,center_y-2,20,4);
		ctx.rect(center_x+5,center_y-2,20,4);
		ctx.stroke();
	};

	function shadeDarkness(ctx, center_x, center_y, rad) {
		var radgrad = ctx.createRadialGradient(center_x,center_y,10,center_x,center_y,rad);
		radgrad.addColorStop(0, 'rgba(0,0,0,0)');
		radgrad.addColorStop(0.7, 'rgba(0,0,0,0)');
		radgrad.addColorStop(1, 'rgba(0,0,0,1)');
		ctx.fillStyle = radgrad;
		ctx.fillRect(center_x-rad,center_y-rad,rad*2,rad*2);
	};
};
