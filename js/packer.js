/**
 * Packer
 * bin-packing algorithm
 */

( function( window, factory ) {
  // universal module definition
  /* jshint strict: false */ /* globals define, module, require */
  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( [ './rect' ], factory );
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS
    module.exports = factory(
      require('./rect')
    );
  } else {
    // browser global
    var Packery = window.Packery = window.Packery || {};
    Packery.Packer = factory( Packery.Rect );
  }

}( window, function factory( Rect ) {
'use strict';

// -------------------------- Packer -------------------------- //

/**
 * @param {Number} width
 * @param {Number} height
 * @param {String} sortDirection
 *   topLeft for vertical, leftTop for horizontal
 */
function Packer( width, height, sortDirection ) {
  this.width = width || 0;
  this.height = height || 0;
  this.sortDirection = sortDirection || 'downwardLeftToRight';

  this.reset();
}

var proto = Packer.prototype;

proto.reset = function() {
  this.spaces = [];

  if ( this.center ) {
    var initialSpaces = [
      // top left
      new Rect ({
        x: 0,
        y: 0,
        width: this.center.x,
        height: this.center.y,
        nearestCornerDistance: 0
      }),
      // top right
      new Rect ({
        x: this.center.x,
        y: 0,
        width: this.width - this.center.x,
        height: this.center.y,
        nearestCornerDistance: 0
      }),
      // bottom left
      new Rect ({
        x: 0,
        y: this.center.y,
        width: this.center.x,
        height: this.height - this.center.y,
        nearestCornerDistance: 0
      }),
      // bottom right
      new Rect ({
        x: this.center.x,
        y: this.center.y,
        width: this.width - this.center.x,
        height: this.height - this.center.y,
        nearestCornerDistance: 0
      })
    ];
    this.spaces = this.spaces.concat( initialSpaces );
  } else {
    var initialSpace = new Rect({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height
    });

    this.spaces.push( initialSpace );
  }

  this.sorter = sorters[ this.sortDirection ] || sorters.downwardLeftToRight;
};

// change x and y of rect to fit with in Packer's available spaces
proto.pack = function( rect ) {
  for ( var i=0; i < this.spaces.length; i++ ) {
    var space = this.spaces[i];
    if ( space.canFit( rect ) ) {
      this.placeInSpace( rect, space );
      break;
    }
  }
};

proto.columnPack = function( rect ) {
  for ( var i=0; i < this.spaces.length; i++ ) {
    var space = this.spaces[i];
    var canFitInSpaceColumn = space.x <= rect.x &&
      space.x + space.width >= rect.x + rect.width &&
      space.height >= rect.height - 0.01; // fudge number for rounding error
    if ( canFitInSpaceColumn ) {
      rect.y = space.y;
      this.placed( rect );
      break;
    }
  }
};

proto.rowPack = function( rect ) {
  for ( var i=0; i < this.spaces.length; i++ ) {
    var space = this.spaces[i];
    var canFitInSpaceRow = space.y <= rect.y &&
      space.y + space.height >= rect.y + rect.height &&
      space.width >= rect.width - 0.01; // fudge number for rounding error
    if ( canFitInSpaceRow ) {
      rect.x = space.x;
      this.placed( rect );
      break;
    }
  }
};

proto.placeInSpace = function( rect, space ) {
  // place rect in space
  if ( this.center ) {
    rect.x = space.x >= this.center.x ? space.x : ( space.x + space.width - rect.width );
    rect.y = space.y >= this.center.y ? space.y : ( space.y + space.height - rect.height );
  } else {

    rect.x = space.x;
    rect.y = space.y;
  }

  this.placed( rect );
};

// update spaces with placed rect
proto.placed = function( rect ) {
  // update spaces
  var revisedSpaces = [];
  for ( var i=0; i < this.spaces.length; i++ ) {
    var space = this.spaces[i];
    var newSpaces = space.getMaximalFreeRects( rect );
    // add either the original space or the new spaces to the revised spaces
    if ( newSpaces ) {
      revisedSpaces.push.apply( revisedSpaces, newSpaces );
      this.measureNearestCornerDistance( newSpaces );
    } else {
      revisedSpaces.push( space );
    }
  }

  this.spaces = revisedSpaces;

  this.mergeSortSpaces();
};

proto.mergeSortSpaces = function() {
  // remove redundant spaces
  Packer.mergeRects( this.spaces );
  this.spaces.sort( this.sorter );
};

Packer.prototype.measureNearestCornerDistance = function( spaces ) {
  if ( !this.center ) {
    return;
  }


  for ( var i=0, len = spaces.length; i < len; i++ ) {
    var space = spaces[i];
    var corner = {
      x: space.x >= this.center.x ? space.x : space.x + space.width,
      y: space.y >= this.center.y ? space.y : space.y + space.height
    };
    space.nearestCornerDistance = getDistance( corner, this.center );
  }

};

function getDistance( pointA, pointB ) {
  var dx = pointB.x - pointA.x;
  var dy = pointB.y - pointA.y;
  return Math.sqrt( dx * dx + dy * dy );
}

// add a space back
proto.addSpace = function( rect ) {
  this.spaces.push( rect );
  this.mergeSortSpaces();
};

// -------------------------- utility functions -------------------------- //

/**
 * Remove redundant rectangle from array of rectangles
 * @param {Array} rects: an array of Rects
 * @returns {Array} rects: an array of Rects
**/
Packer.mergeRects = function( rects ) {
  var i = 0;
  var rect = rects[i];

  rectLoop:
  while ( rect ) {
    var j = 0;
    var compareRect = rects[ i + j ];

    while ( compareRect ) {
      if  ( compareRect == rect ) {
        j++; // next
      } else if ( compareRect.contains( rect ) ) {
        // remove rect
        rects.splice( i, 1 );
        rect = rects[i]; // set next rect
        continue rectLoop; // bail on compareLoop
      } else if ( rect.contains( compareRect ) ) {
        // remove compareRect
        rects.splice( i + j, 1 );
      } else {
        j++;
      }
      compareRect = rects[ i + j ]; // set next compareRect
    }
    i++;
    rect = rects[i];
  }

  return rects;
};


// -------------------------- sorters -------------------------- //

// functions for sorting rects in order
var sorters = {
  // top down, then left to right
  downwardLeftToRight: function( a, b ) {
    return a.y - b.y || a.x - b.x;
  },
  // left to right, then top down
  rightwardTopToBottom: function( a, b ) {
    return a.x - b.x || a.y - b.y;
  },

  centeredOutCorners: function ( a, b ) {
    return a.nearestCornerDistance - b.nearestCornerDistance;
  }
};


// --------------------------  -------------------------- //

return Packer;

}));
