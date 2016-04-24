function Tesselate(selector, options) {
    if (!options) {
        options = {};
    }
    this_ = this;
    this_.element = $(selector);
    this_.width = this_.element.width();
    this_.height = this_.element.height();
    this_.size = options.size || 100;
    this_.horizontalSpacing = Math.cos(Math.PI / 3) * this_.size / 2;
    this_.verticalSpacing = Math.sin(Math.PI / 3) * this_.size / 2;
    this_.points = [];
    this_.maxEdgeDistance = options.maxEdgeDistance || 60;
    this_.style = null

    this_.init = function(styleName) {
        if (!styleName || !this_.tesselationStyles[styleName]) {
            styleName = 'translate'
        }

        this_.element.html('<svg><g class="shapes"></g><g class="points"></g></svg>');
        this_.element.find('.points').attr('transform', 'translate('+(this_.width / 2)+', '+(this_.height / 2)+')');

        this_.setStyle(styleName);
    };

    this_.setStyle = function(styleName) {
        this_.style = this_.tesselationStyles[styleName];
        this_.element.find('.points').html('');
        this_.points = [];
        for(var i = 0; i < 6; i++) {
            var angle = i * 60;
            this_.points.push(this_.createPoint(
                Math.cos(angle * (Math.PI / 180)) * this_.size,
                Math.sin(angle * (Math.PI / 180)) * this_.size
            ));
        }

        for(var i = 0; i < this_.points.length; i = i + 2) {
            this_.addMiddlePoint(this_.points[i], i);
        }

        this_.style.initPoints();

        for(var i = 0; i < this_.points.length; i++) {
            this_.bindPoint(this_.points[i]);
        }

        this_.addPointsIfNeeded();
        this_.draw();
        this_.onChange();
    };

    this_.onChange = function() {
        if (options.onChange) {
            var eventPoints = [];
            for(var i = 0; i < this_.points.length; i++) {
                eventPoints.push([this_.points[i].x, this_.points[i].y]);
            }
            options.onChange(eventPoints);
        }
    };

    this_.createPoint = function(x, y) {
        return {
            x: x,
            y: y,
            originalX: x,
            originalY: y,
            tag: Math.floor(Math.random() * 1000000000).toString(16),
            boundPoints: [],
            movable: true
        }
    };

    this_.bindPoint = function(point) {
        if (!point.movable) {
            return;
        }
        var pointGroup = this_.element.find('.points');
        pointGroup.html(
            pointGroup.html() +
            '<circle cx="'+point.x+'", cy="'+point.y+'" r="8" tag="'+point.tag+'"/>'
        )

        pointGroup.children('circle').draggable({
            stop: function() {
                this_.addPointsIfNeeded();
                this_.onChange();
            }
        }).bind('drag', function(event, ui) {
            var newX = ui.position.left - this_.width / 2;
            var newY = ui.position.top - this_.height / 2;
            for(var i = 0; i < this_.points.length; i++) {
                if ($(event.target).attr('tag') == this_.points[i].tag) {
                    this_.setPointPosition(i, newX, newY, true);
                }
            }
        });
    };

    this_.setPointPosition = function(i, x, y, preventEvents) {
        var point = this_.points[i];
        if (!point.movable) {
            return false;
        }
        var circle = this_.element.find("circle[tag='"+point.tag+"']");
        circle.attr('cx', x);
        circle.attr('cy', y);
        point.x = x;
        point.y = y;

        this_.style.updateDependentPoints(point)

        for(var i = 0; i < point.boundPoints.length; i++) {
            var boundPoint = point.boundPoints[i];
            var boundCircle = circle.siblings("[tag='"+boundPoint.tag+"']");
            boundCircle.attr('cx', boundPoint.x);
            boundCircle.attr('cy', boundPoint.y);
        }
        this_.draw();
        if (!preventEvents) {
            this_.addPointsIfNeeded();
            this_.onChange();
        }
    };

    this_.addPointsIfNeeded = function() {
        for(var i = 0; i < this_.points.length; i++) {
            var point = this_.points[i];
            var nextPoint = this_.points[(i + 1) % this_.points.length];
            var distance = Math.sqrt(
                Math.pow(point.x - nextPoint.x, 2) +
                Math.pow(point.y - nextPoint.y, 2)
            );
            if (distance > this_.maxEdgeDistance) {
                var newPoint = this_.addMiddlePoint(point, i, nextPoint)
                this_.bindPoint(newPoint);
                var pairedPoint = this_.getPairedPoint(newPoint, point, nextPoint);
                newPoint.boundPoints = [pairedPoint];
                this_.style.setupAddedPoint(newPoint, point, nextPoint);
            }
        }
    };

    this_.addMiddlePoint = function(point, pointIndex, nextPoint) {
        if (!nextPoint) {
            nextPoint = this_.points[(pointIndex + 1) % this_.points.length];
        }
        var newPoint = this_.createPoint(
            (point.x + nextPoint.x) / 2,
            (point.y + nextPoint.y) / 2
        );
        this_.points.splice(pointIndex + 1, 0, newPoint)
        return newPoint;
    };

    this_.getPairedPoint = function(newPoint, prevPoint, nextPoint) {
        var pairedPoint = null;
        var prevBound = null;
        var nextBound = null;
        for(var i = 0; i < prevPoint.boundPoints.length; i++) {
            prevBound = prevPoint.boundPoints[i];
            var prevBoundIndex = this_.points.indexOf(prevBound);
            for(var j = 0; j < nextPoint.boundPoints.length; j++) {
                nextBound = nextPoint.boundPoints[j];
                var nextBoundIndex = this_.points.indexOf(nextBound)
                if (Math.abs(prevBoundIndex - nextBoundIndex) == 1) {
                    if (prevBoundIndex < nextBoundIndex) {
                        pairedPoint = this_.addMiddlePoint(prevBound, prevBoundIndex, nextBound);
                    }
                    if (nextBoundIndex < prevBoundIndex) {
                        pairedPoint = this_.addMiddlePoint(nextBound, nextBoundIndex, prevBound);
                    }
                } else if (Math.abs(prevBoundIndex - nextBoundIndex) == this_.points.length - 1) {
                    if (nextBoundIndex == 0 && prevBoundIndex == this_.points.length - 1) {
                        pairedPoint = this_.addMiddlePoint(prevBound, prevBoundIndex, nextBound);
                    }
                    if (prevBoundIndex == 0 && nextBoundIndex == this_.points.length - 1) {
                        pairedPoint = this_.addMiddlePoint(nextBound, nextBoundIndex, prevBound);
                    }
                }
                if (pairedPoint) {
                    break;
                }
            }
            if (pairedPoint) {
                break;
            }
        }
        pairedPoint.boundPoints = [newPoint];
        this_.bindPoint(pairedPoint);
        this_.style.setupAddedPoint(pairedPoint, prevBound, nextBound);
        return pairedPoint;
    };

    this_.draw = function() {
        this_.style.draw();
    };

    this_._drawPolygon = function(x, y, transformCallback, className, addlTransform) {
        var pointStrings = [];
        for(var i = 0; i < this_.points.length; i++) {
            var point = this_.points[i];
            if (transformCallback) {
                point = transformCallback(point);
            }
            pointStrings.push(
                point.x+','+point.y
            );
        }
        return '<g transform="translate('+x+', '+y+')'+(addlTransform ? ' '+addlTransform : '')+'">'+
            '<polygon points="'+pointStrings.join(' ')+'" '+(className?'class="'+className+'"':'')+'/>'+
        '</g>';
    };

    this_.tesselationStyles = {
        translate: {
            initPoints: function() {
                for(var i = 0; i < this_.points.length; i = i + 2) {
                    //corner points
                    var point = this_.points[i];
                    point.boundPoints = [
                        this_.points[(i + 4) % this_.points.length],
                        this_.points[(i + 8) % this_.points.length]
                    ]
                }
                for(var i = 1; i < this_.points.length; i = i + 2) {
                    //mid point
                    var point = this_.points[i];
                    point.boundPoints = [
                        this_.points[(i + 6) % this_.points.length],
                    ]
                }
            },
            setupAddedPoint(point, prevPoint, nextPoint) {
                // nothing needed
            },
            updateDependentPoints: function(point) {
                for(var i = 0; i < point.boundPoints.length; i++) {
                    var boundPoint = point.boundPoints[i];
                    boundPoint.x = boundPoint.originalX + (point.x - point.originalX);
                    boundPoint.y = boundPoint.originalY + (point.y - point.originalY);
                }
            },
            draw: function() {
                var shapesGroup = this_.element.find('.shapes');
                svgString = '';
                for(var i = -4; i <= 4; i++) {
                    for(var j = -8; j <= 8; j++) {
                        svgString += this_._drawPolygon(
                            this_.size * 3 * i + (this_.size + this_.horizontalSpacing * 2) * (j%2) + this_.width / 2,
                            this_.verticalSpacing * 2 * j + this_.height / 2
                        );
                    }
                }

                shapesGroup.html(svgString);
            }
        },
        reflect: {
            initPoints: function() {
                for(var i = 0; i < this_.points.length; i = i + 1) {
                    var point = this_.points[i];
                    point.boundPoints = []
                }

                function setupHalf(offset) {
                    function getOffsetPoint(value) {
                        return this_.points[(value + offset) % 12];
                    }
                    getOffsetPoint(0).boundPoints = [getOffsetPoint(2), getOffsetPoint(10)];
                    getOffsetPoint(0).bindTypes = {};
                    getOffsetPoint(0).bindTypes[getOffsetPoint(2).tag] = 'inverted';
                    getOffsetPoint(0).bindTypes[getOffsetPoint(10).tag] = 'inverted';

                    getOffsetPoint(1).boundPoints = [getOffsetPoint(11)];
                    getOffsetPoint(1).bindTypes = {};
                    getOffsetPoint(1).bindTypes[getOffsetPoint(11).tag] = 'inverted';

                    getOffsetPoint(2).boundPoints = [getOffsetPoint(0), getOffsetPoint(10)];
                    getOffsetPoint(2).bindTypes = {};
                    getOffsetPoint(2).bindTypes[getOffsetPoint(0).tag] = 'inverted';
                    getOffsetPoint(2).bindTypes[getOffsetPoint(10).tag] = 'standard';

                    getOffsetPoint(3).boundPoints = [getOffsetPoint(9)];
                    getOffsetPoint(3).bindTypes = {};
                    getOffsetPoint(3).bindTypes[getOffsetPoint(9).tag] = 'standard';

                    getOffsetPoint(4).boundPoints = [getOffsetPoint(6), getOffsetPoint(8)];
                    getOffsetPoint(4).bindTypes = {};
                    getOffsetPoint(4).bindTypes[getOffsetPoint(6).tag] = 'inverted';
                    getOffsetPoint(4).bindTypes[getOffsetPoint(8).tag] = 'standard';

                    getOffsetPoint(5).boundPoints = [getOffsetPoint(7)];
                    getOffsetPoint(5).bindTypes = {};
                    getOffsetPoint(5).bindTypes[getOffsetPoint(7).tag] = 'inverted';
                }
                setupHalf(0);
                setupHalf(6);
            },
            setupAddedPoint(point, prevPoint, nextPoint) {
                point.bindTypes = {};
                var prevStandard = false;
                var nextStandard = false;
                for(var key in prevPoint.bindTypes) {
                    if (prevPoint.bindTypes[key] == 'standard') {
                        prevStandard = true;
                    }
                }
                for(var key in nextPoint.bindTypes) {
                    if (nextPoint.bindTypes[key] == 'standard') {
                        nextStandard = true;
                    }
                }
                var bindType = (prevStandard && nextStandard) ? 'standard' : 'inverted';
                for(var i = 0; i < point.boundPoints.length; i++) {
                    point.bindTypes[point.boundPoints[i].tag] = bindType;
                }
            },
            updateDependentPoints: function(point) {
                for(var i = 0; i < point.boundPoints.length; i++) {
                    var boundPoint = point.boundPoints[i];
                    boundPoint.x = boundPoint.originalX + (point.x - point.originalX) * (point.bindTypes[boundPoint.tag] == 'inverted' ? -1 : 1);
                    boundPoint.y = boundPoint.originalY + (point.y - point.originalY);
                }
            },
            draw: function() {
                var reversePoints = function(point) {
                    return {
                        x: -point.x,
                        y: point.y
                    };
                }
                var shapesGroup = this_.element.find('.shapes');
                svgString = '';
                for(var i = -4; i <= 4; i++) {
                    for(var j = -8; j <= 8; j++) {
                        svgString += this_._drawPolygon(
                            this_.size * 3 * i + (this_.size + this_.horizontalSpacing * 2) * (j%2) + this_.width / 2,
                            this_.verticalSpacing * 2 * j + this_.height / 2,
                            j % 2 ? reversePoints : undefined
                        );
                    }
                }

                shapesGroup.html(svgString);
            }
        },
        rotate: {
            initPoints: function() {
                function getOffsetPoint(value) {
                    return this_.points[value % 12];
                }
                for(var i = 0 ; i < 12; i=i+4) {
                    getOffsetPoint(i+0).boundPoints = [getOffsetPoint(i+4), getOffsetPoint(i+8)];
                    getOffsetPoint(i+0).bindRotation = {}
                    getOffsetPoint(i+0).bindRotation[getOffsetPoint(i+4).tag] = 120;
                    getOffsetPoint(i+0).bindRotation[getOffsetPoint(i+8).tag] = 240;

                    getOffsetPoint(i+1).boundPoints = [getOffsetPoint(i+3)];
                    getOffsetPoint(i+1).bindRotation = {}
                    getOffsetPoint(i+1).bindRotation[getOffsetPoint(i+3).tag] = 120;

                    getOffsetPoint(i+2).movable = false;
                    // used for dynamic point addition
                    getOffsetPoint(i+2).boundPoints = [getOffsetPoint(i+2), getOffsetPoint(i+6), getOffsetPoint(i+10)];
                    getOffsetPoint(i+2).bindRotation = {}

                    getOffsetPoint(i+3).boundPoints = [getOffsetPoint(i+1)];
                    getOffsetPoint(i+3).bindRotation = {};
                    getOffsetPoint(i+3).bindRotation[getOffsetPoint(i+1).tag] = 240;

                }
            },
            setupAddedPoint(point, prevPoint, nextPoint) {
                var prevRotations = [];
                for(var key in prevPoint.bindRotation) {
                    prevRotations.push(prevPoint.bindRotation[key])
                }
                var nextRotations = [];
                for(var key in nextPoint.bindRotation) {
                    nextRotations.push(nextPoint.bindRotation[key])
                }

                var rotation = 0;
                if(prevRotations.length == 0) {
                    rotation = nextRotations[0];
                } else if(nextRotations.length == 0) {
                    rotation = prevRotations[0];
                } else {
                    for(var i = 0; i < prevRotations.length; i++) {
                        for(var j = 0; j < nextRotations.length; j++) {
                            if(prevRotations[i] == nextRotations[j]) {
                                rotation = prevRotations[i]
                            }
                        }
                    }
                }

                point.bindRotation = {}
                for(var i = 0; i < point.boundPoints.length; i++) {
                    point.bindRotation[point.boundPoints[i].tag] = rotation;
                }
            },
            updateDependentPoints: function(point) {
                for(var i = 0; i < point.boundPoints.length; i++) {
                    var boundPoint = point.boundPoints[i];
                    var xChange = 0;
                    var yChange = 0;
                    var directMovementX = point.x - point.originalX;
                    var directMovementY = point.y - point.originalY;
                    var xRadianRotation = ((360 - point.bindRotation[boundPoint.tag]) / 360.0) * (Math.PI * 2);
                    var yRadianRotation = (point.bindRotation[boundPoint.tag] / 360.0) * (Math.PI * 2);
                    xChange += Math.cos(xRadianRotation) * directMovementX;
                    yChange += Math.sin(xRadianRotation) * directMovementX;
                    xChange += Math.sin(yRadianRotation) * directMovementY;
                    yChange += Math.cos(yRadianRotation) * directMovementY;
                    boundPoint.x = boundPoint.originalX + xChange;
                    boundPoint.y = boundPoint.originalY + yChange;
                }
            },
            draw: function() {
                var shapesGroup = this_.element.find('.shapes');
                svgString = '';
                for(var i = -4; i <= 4; i++) {
                    for(var j = -8; j <= 8; j++) {
                        svgString += this_._drawPolygon(
                            this_.size * 3 * i + (this_.size + this_.horizontalSpacing * 2) * (j%2) + this_.width / 2,
                            this_.verticalSpacing * 2 * j + this_.height / 2,
                            undefined,
                            undefined,
                            'rotate('+((j % 3) * 120)+')'
                        );
                    }
                }

                shapesGroup.html(svgString);
            }
        }
    };

    this_.init(options.style);

    return this_;
};