function ShapeDiff(selector, options) {
    this_ = this;
    this_.element = $(selector);

    this_.init = function() {
        this_.element.html('<canvas></canvas>');
        this_.canvas = this_.element.find('canvas');
        this_.context = this_.canvas[0].getContext("2d");

    }

    this_.getDiff = function(points1, points2) {
        var shape1 = this_.getShape(points1);
        var shape2 = this_.getShape(points2);
        var width = (shape1.width > shape2.width ? shape1.width : shape2.width) + 20;
        var height = (shape1.height > shape2.height ? shape1.height : shape2.height) + 20;

        this_.context.canvas.width = width;
        this_.context.canvas.height = height;
        this_.context.fillStyle = "#FFFFFF";
        this_.context.fillRect(0,0,width,height);

        this_.drawShape(shape1, width, height);
        this_.drawShape(shape2, width, height);

    };

    this_.getShape = function(points) {
        var minX = points[0][0],
            maxX = points[0][0],
            minY = points[0][1],
            maxY = points[0][1];

        for(var i = 0; i < points.length; i++) {
            var point = points[i]
            if (point[0] < minX) {
                minX = point[0]
            }
            if (point[0] > maxX) {
                maxX = point[0]
            }
            if (point[1] < minY) {
                minY = point[1]
            }
            if (point[1] > maxY) {
                maxY = point[1]
            }
        }
        var shape = {
            width: maxX - minX,
            height: maxY - minY,
            points: []
        }
        for(var i = 0; i < points.length; i++) {
            shape.points.push([
                points[i][0] - minX,
                points[i][1] - minY
            ]);
        }
        return shape;
    };

    this_.drawShape = function(shape, width, height) {
        this_.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this_.context.beginPath();
        offsetX = (width - shape.width) / 2;
        offsetY = (height - shape.height) / 2;
        this_.context.moveTo(
            shape.points[0][0] + offsetX,
            shape.points[0][1] + offsetY
        );
        for(var i = 1; i < shape.points.length; i++) {
            this_.context.lineTo(
                shape.points[i][0] + offsetX,
                shape.points[i][1] + offsetY
            );
        }
        this_.context.closePath();
        this_.context.fill();
    };

    this_.init();

    return this_;
}