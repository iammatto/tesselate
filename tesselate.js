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
    this_.style = null;
    this_.editable = true;

    this_.init = function(styleName, shapeName) {
        if (!styleName || !this_.tesselationStyles[styleName]) {
            styleName = 'translate'
        }

        this_.element.html('<svg><g class="shapes"></g><g class="points"></g></svg>');
        this_.element.find('.points').attr('transform', 'translate('+(this_.width / 2)+', '+(this_.height / 2)+')');

        this_.setStyle(styleName, shapeName);
    };

    this_.setStyle = function(styleName, shapeName) {
        if (!shapeName) {
            shapeName = 'hexagon';
        }
        this_.style = this_.tesselationStyles[styleName];
        this_.shape = this_.tesselationShapes[styleName][shapeName];
        console.log('SAEHOUT', styleName, shapeName, this_.shape)
        this_.element.find('.points').html('');
        this_.points = [];

        this_.shape.init();

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
        if (!this_.editable || !point.movable) {
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

    this_.makeUneditable = function() {
        this_.editable = false;
        this_.element.find('.points circle').remove();
    };
    this_.makeEditable = function() {
        this_.editable = true;
        for(var i = 0; i < this_.points.length; i++) {
            this_.bindPoint(this_.points[i]);
        }
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
            var boundPoint = this_.getPointByTag(point.boundPoints[i]);
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
                newPoint.boundPoints = [pairedPoint.tag];
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
            prevBound = this_.getPointByTag(prevPoint.boundPoints[i]);
            var prevBoundIndex = this_.points.indexOf(prevBound);
            for(var j = 0; j < nextPoint.boundPoints.length; j++) {
                nextBound = this_.getPointByTag(nextPoint.boundPoints[j]);
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
        pairedPoint.boundPoints = [newPoint.tag];
        this_.bindPoint(pairedPoint);
        this_.style.setupAddedPoint(pairedPoint, prevBound, nextBound);
        return pairedPoint;
    };

    this_.draw = function() {
        this_.shape.draw();
    };

    this_._drawPolygon = function(x, y, pointCallback, addlTransform) {
        var pointStrings = [];
        for(var i = 0; i < this_.points.length; i++) {
            var point = this_.points[i];
            if (pointCallback) {
                point = pointCallback(point);
            }
            pointStrings.push(
                point.x+','+point.y
            );
        }
        return '<g transform="translate('+x+', '+y+')'+(addlTransform ? ' '+addlTransform : '')+'">'+
            '<polygon points="'+pointStrings.join(' ')+'"/>'+
        '</g>';
    };

    this_.getPointByTag = function(tag) {
        for(var i = 0; i < this_.points.length; i++) {
            if(this_.points[i].tag == tag) {
                return this_.points[i];
            }
        }
    };

    this_.shapes = {
        hexagon: {
            init: function() {
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
            },
            draw: function(pointCallback, transformCallback) {
                var shapesGroup = this_.element.find('.shapes');
                svgString = '';
                for(var i = -4; i <= 4; i++) {
                    for(var j = -8; j <= 8; j++) {
                        svgString += this_._drawPolygon(
                            this_.size * 3 * i + (this_.size + this_.horizontalSpacing * 2) * (j%2) + this_.width / 2,
                            this_.verticalSpacing * 2 * j + this_.height / 2,
                            pointCallback ? pointCallback(i, j) : undefined,
                            transformCallback ? transformCallback(i, j) : undefined
                        );
                    }
                }

                shapesGroup.html(svgString);
            }
        },
        square: {
            init: function() {
                this_.points = [
                    this_.createPoint(-this_.size, -this_.size),
                    this_.createPoint(-this_.size, this_.size),
                    this_.createPoint(this_.size, this_.size),
                    this_.createPoint(this_.size, -this_.size)
                ];

                for(var i = 0; i < this_.points.length; i = i + 2) {
                    this_.addMiddlePoint(this_.points[i], i);
                }
            },
            draw: function() {
                var shapesGroup = this_.element.find('.shapes');
                svgString = '';
                for(var i = -4; i <= 4; i++) {
                    for(var j = -4; j <= 4; j++) {
                        svgString += this_._drawPolygon(
                            this_.size * 3 * i + (this_.size + this_.horizontalSpacing * 2) * (j%2) + this_.width / 2,
                            this_.verticalSpacing * 2 * j + this_.height / 2,
                            pointCallback ? pointCallback(i, j) : undefined,
                            transformCallback ? transformCallback(i, j) : undefined
                        );
                    }
                }

                shapesGroup.html(svgString);
            }
        }
    };

    this_.tesselationShapes = {
        translate: {
            hexagon: {
                init: function() {
                    this_.shapes.hexagon.init();

                    for(var i = 0; i < this_.points.length; i = i + 2) {
                        //corner points
                        var point = this_.points[i];
                        point.boundPoints = [
                            this_.points[(i + 4) % this_.points.length].tag,
                            this_.points[(i + 8) % this_.points.length].tag
                        ]
                    }
                    for(var i = 1; i < this_.points.length; i = i + 2) {
                        //mid point
                        var point = this_.points[i];
                        point.boundPoints = [
                            this_.points[(i + 6) % this_.points.length].tag,
                        ]
                    }
                },
                draw: this_.shapes.hexagon.draw
            },
            square: {
                init: function() {
                    this_.shapes.square.init();
                    for(var i = 0; i < this_.points.length; i = i + 2) {
                        //corner points
                        var point = this_.points[i];
                        point.boundPoints = [
                            this_.points[(i + 2) % this_.points.length].tag,
                            this_.points[(i + 4) % this_.points.length].tag,
                            this_.points[(i + 4) % this_.points.length].tag
                        ];
                    }

                    for(var i = 1; i < this_.points.length; i = i + 2) {
                        //mid point
                        var point = this_.points[i];
                        point.boundPoints = [
                            this_.points[(i + 4) % this_.points.length].tag,
                        ];
                    }
                },
                draw: this_.shapes.square.draw
            }
        },
        reflect: {
            hexagon: {
                init: function() {
                    this_.shapes.hexagon.init();

                    for(var i = 0; i < this_.points.length; i = i + 1) {
                        var point = this_.points[i];
                        point.boundPoints = []
                    }

                    function setupHalf(offset) {
                        function getOffsetPoint(value) {
                            return this_.points[(value + offset) % 12];
                        }
                        getOffsetPoint(0).boundPoints = [getOffsetPoint(2).tag, getOffsetPoint(10).tag];
                        getOffsetPoint(0).bindTypes = {};
                        getOffsetPoint(0).bindTypes[getOffsetPoint(2).tag] = 'inverted';
                        getOffsetPoint(0).bindTypes[getOffsetPoint(10).tag] = 'inverted';

                        getOffsetPoint(1).boundPoints = [getOffsetPoint(11).tag];
                        getOffsetPoint(1).bindTypes = {};
                        getOffsetPoint(1).bindTypes[getOffsetPoint(11).tag] = 'inverted';

                        getOffsetPoint(2).boundPoints = [getOffsetPoint(0).tag, getOffsetPoint(10).tag];
                        getOffsetPoint(2).bindTypes = {};
                        getOffsetPoint(2).bindTypes[getOffsetPoint(0).tag] = 'inverted';
                        getOffsetPoint(2).bindTypes[getOffsetPoint(10).tag] = 'standard';

                        getOffsetPoint(3).boundPoints = [getOffsetPoint(9).tag];
                        getOffsetPoint(3).bindTypes = {};
                        getOffsetPoint(3).bindTypes[getOffsetPoint(9).tag] = 'standard';

                        getOffsetPoint(4).boundPoints = [getOffsetPoint(6).tag, getOffsetPoint(8).tag];
                        getOffsetPoint(4).bindTypes = {};
                        getOffsetPoint(4).bindTypes[getOffsetPoint(6).tag] = 'inverted';
                        getOffsetPoint(4).bindTypes[getOffsetPoint(8).tag] = 'standard';

                        getOffsetPoint(5).boundPoints = [getOffsetPoint(7).tag];
                        getOffsetPoint(5).bindTypes = {};
                        getOffsetPoint(5).bindTypes[getOffsetPoint(7).tag] = 'inverted';
                    }
                    setupHalf(0);
                    setupHalf(6);
                },
                draw: function() {
                    var reversalCallback = function(i, j) {
                        if (j % 2) {
                            return function(point) {
                                return {
                                    x: -point.x,
                                    y: point.y
                                };
                            }
                        }
                    }
                    this_.shapes.hexagon.draw(reversalCallback)
                }
            },
        },
        rotate: {
            hexagon: {
                init: function() {
                    this_.shapes.hexagon.init();

                    function getOffsetPoint(value) {
                        return this_.points[value % 12];
                    }
                    for(var i = 0 ; i < 12; i=i+4) {
                        getOffsetPoint(i+0).boundPoints = [getOffsetPoint(i+4).tag, getOffsetPoint(i+8).tag];
                        getOffsetPoint(i+0).bindRotation = {}
                        getOffsetPoint(i+0).bindRotation[getOffsetPoint(i+4).tag] = 120;
                        getOffsetPoint(i+0).bindRotation[getOffsetPoint(i+8).tag] = 240;

                        getOffsetPoint(i+1).boundPoints = [getOffsetPoint(i+3).tag];
                        getOffsetPoint(i+1).bindRotation = {}
                        getOffsetPoint(i+1).bindRotation[getOffsetPoint(i+3).tag] = 120;

                        getOffsetPoint(i+2).movable = false;
                        // used for dynamic point addition
                        getOffsetPoint(i+2).boundPoints = [getOffsetPoint(i+2).tag, getOffsetPoint(i+6).tag, getOffsetPoint(i+10).tag];
                        getOffsetPoint(i+2).bindRotation = {}

                        getOffsetPoint(i+3).boundPoints = [getOffsetPoint(i+1).tag];
                        getOffsetPoint(i+3).bindRotation = {};
                        getOffsetPoint(i+3).bindRotation[getOffsetPoint(i+1).tag] = 240;

                    }
                },
                draw: function() {
                    var transformCallback = function(i, j) {
                        return 'rotate('+((j % 3) * 120)+')'
                    }
                    this_.shapes.hexagon.draw(undefined, transformCallback)
                }
            }
        }
    };

    this_.tesselationStyles = {
        translate: {
            setupAddedPoint(point, prevPoint, nextPoint) {
                // nothing needed
            },
            updateDependentPoints: function(point) {
                for(var i = 0; i < point.boundPoints.length; i++) {
                    var boundPoint = this_.getPointByTag(point.boundPoints[i]);
                    boundPoint.x = boundPoint.originalX + (point.x - point.originalX);
                    boundPoint.y = boundPoint.originalY + (point.y - point.originalY);
                }
            },
        },
        reflect: {
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
                    point.bindTypes[point.boundPoints[i]] = bindType;
                }
            },
            updateDependentPoints: function(point) {
                for(var i = 0; i < point.boundPoints.length; i++) {
                    var boundPoint = this_.getPointByTag(point.boundPoints[i]);
                    boundPoint.x = boundPoint.originalX + (point.x - point.originalX) * (point.bindTypes[boundPoint.tag] == 'inverted' ? -1 : 1);
                    boundPoint.y = boundPoint.originalY + (point.y - point.originalY);
                }
            }
        },
        rotate: {
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
                    point.bindRotation[point.boundPoints[i]] = rotation;
                }
            },
            updateDependentPoints: function(point) {
                for(var i = 0; i < point.boundPoints.length; i++) {
                    var boundPoint = this_.getPointByTag(point.boundPoints[i]);
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
            }
        }
    };

    this_.init(options.style, options.shape);

    return this_;
};