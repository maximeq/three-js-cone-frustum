'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var three = require('@dualbox/three');

function checkDependancy(packageName, dependancyName, dependancy) {
    let duplicationMessage = `${packageName}: ${dependancyName} is duplicated. Your bundle includes ${dependancyName} twice. Please repair your bundle.`;
    try {
        if (THREE[dependancyName] === undefined) {
            THREE[dependancyName] = dependancy;
            return;
        }

        if (THREE[dependancyName] !== dependancy) {
            throw duplicationMessage;
        }
    } catch (error) {
        if (error !== duplicationMessage) {
            console.warn(
                `${packageName}: Duplication check unavailable.` + error
            );
        } else {
            throw error;
        }
    }
}

function checkThreeRevision(packageName, revision) {
    if (THREE.REVISION != revision) {
        console.error(
            `${packageName} depends on THREE revision ${revision}, but current revision is ${THREE.REVISION}.`
        );
    }
}

three.Ray.prototype.intersectsConeFrustum = function () {

    const D = new three.Vector3();
    const target2 = new three.Vector3();
    const u = new three.Vector3();

    return function ( frustum, target ) {

        if ( target == null )
            target = target2;

        const deltaR = frustum.radius1 - frustum.radius0;
        const r = 1 + Math.pow( deltaR / frustum.height, 2 );
        const R = frustum.radius0 * deltaR / frustum.height;

        D.subVectors( this.origin, frustum.base );
        const DdA = D.dot( frustum.axis );
        const DdD = D.dot( D );
        const VdA = this.direction.dot( frustum.axis );
        const VdD = this.direction.dot( D );
        const VdV = this.direction.dot( this.direction );

        const c0 = frustum.radius0 * frustum.radius0 + 2 * R * DdA + r * DdA * DdA - DdD;
        const c1 = R * VdA + r * DdA * VdA - VdD;
        const c2 = r * VdA * VdA - VdV;

        if ( c2 !== 0 ) {

            const discr = c1 * c1 - c2 * c0;

            if ( discr < 0 )
                return null;

            else if ( discr === 0 ) {

                const t = - c1 / c2;
                u.copy( D );
                u.addScaledVector( this.direction, t );
                const d = frustum.axis.dot( u );

                if ( t >= 0 && d >= 0 && d <= frustum.height ) {

                    target2.addVectors( frustum.base, u );
                    target.copy( target2 );
                    return target2;

                }

            } else {

                let quantity = 0;
                const root = Math.sqrt( discr );

                const t0 = ( - c1 - root ) / c2;
                u.copy( D );
                u.addScaledVector( this.direction, t0 );
                let d = frustum.axis.dot( u );

                if ( t0 >= 0 && d >= 0 && d <= frustum.height ) {

                    target2.addVectors( frustum.base, u );
                    quantity ++;

                }

                const t1 = ( - c1 + root ) / c2;
                u.copy( D );
                u.addScaledVector( this.direction, t1 );
                d = frustum.axis.dot( u );

                if ( t1 >= 0 && ( quantity === 0 || t0 > t1 ) && d >= 0 && d <= frustum.height ) {

                    target2.addVectors( frustum.base, u );
                    quantity ++;

                }

                if ( quantity ) target.copy( target2 );
                return quantity ? target2 : null;

            }

        } else if ( c1 !== 0 ) {

            const t = - 2 * c0 / c1;
            u.copy( D );
            u.addScaledVector( this.direction, t );
            const d = frustum.axis.dot( u );

            if ( t >= 0 && d >= 0 && d <= frustum.height ) {

                target2.addVectors( frustum.base, u );
                target.copy( target2 );
                return target;

            }

        }

        return null;

    };

}();

const tmpVec = new three.Vector3(); new three.Vector3(); const tmpVec2 = new three.Vector3(); new three.Vector3();
const tmpMat = new three.Matrix4();
const baseCubePositions = new three.BoxBufferGeometry( 2, 2, 2 ).toNonIndexed().attributes.position;

/**
 * @author Max Godefroy <max@godefroy.net>
 */


class ConeFrustum {

	/**
     * @param base      {?Vector3}
     * @param axis      {?Vector3}
     * @param height    {?number}
     * @param radius0   {?number}
     * @param radius1   {?number}
     */
	constructor( base, axis, height, radius0, radius1 ) {

		this.base = base || new three.Vector3();

		this.axis = axis || new three.Vector3( 0, 1, 0 );
		this.axis.normalize();

		this.height = height || 1;
		this.radius0 = radius0 || 0;
		this.radius1 = radius1 || 0;

	}


	/**
     * @param center0   {!Vector3}
     * @param radius0   {number}
     * @param center1   {!Vector3}
     * @param radius1   {number}
     * @returns {ConeFrustum}
     */
	static fromCapsule( center0, radius0, center1, radius1 ) {

		if ( radius0 > radius1 )
			return this.fromCapsule( center1, radius1, center0, radius0 );

		const axis = new three.Vector3().subVectors( center1, center0 );

		if ( axis.length() === 0 )
			throw "Capsule height must not be zero";

		const sinTheta = ( radius1 - radius0 ) / axis.length();
		const height = axis.length() + sinTheta * ( radius0 - radius1 );
		const base = new three.Vector3().copy( center0 ).addScaledVector( axis.normalize(), - sinTheta * radius0 );
		const cosTheta = Math.cos( Math.asin( sinTheta ) );

		return new ConeFrustum( base, axis, height, radius0 * cosTheta, radius1 * cosTheta );

	}

	/**
     *  Project the given point on the axis, in a direction orthogonal to the cone frustum surface.
     **/
	orthogonalProject( p, target ) {

		// We will work in 2D, in the orthogonal basis x = this.axis and y = orthogonal vector to this.axis in the plane (this.basis, p, this.basis + this.axis),
		// and such that p has positive y coordinate in this basis.
		// The wanted projection is the point at the intersection of:
		//  - the local X axis (computation in the unit_dir basis)
		//  and
		//  - the line defined by P and the vector orthogonal to the weight line
		const baseToP = tmpVec;
		baseToP.subVectors( p, this.base );
		const baseToPlsq = baseToP.lengthSq();
		const p2Dx = baseToP.dot( this.axis );
		// pythagore inc.
		const p2DySq = baseToPlsq - p2Dx * p2Dx;
		const p2Dy = p2DySq > 0 ? Math.sqrt( p2DySq ) : 0; // because of rounded errors tmp can be <0 and this causes the next sqrt to return NaN...

		const t = p2Dx - p2Dy * ( this.radius0 - this.radius1 ) / this.height;

		target.copy( this.axis ).multiplyScalar( t ).add( this.base );

	}

	/**
     * @param frustum   {!ConeFrustum}
     */
	copy( frustum ) {

		this.base = frustum.base.clone();
		this.axis = frustum.axis.clone();
		this.height = frustum.height;
		this.radius0 = frustum.radius0;
		this.radius1 = frustum.radius1;

	}


	clone() {

		return new ConeFrustum().copy( this );

	}


	empty() {

		return this.height === 0 || ( this.radius0 === 0 && this.radius1 === 0 );

	}


	/**
     * @param target    {?Box3}
	 * @returns {!Box3}
     */
	getBoundingBox( target ) {

		const c = this.base.clone();
		const d = new three.Vector3();

		d.set(
			Math.sqrt( 1.0 - this.axis.x * this.axis.x ),
			Math.sqrt( 1.0 - this.axis.y * this.axis.y ),
			Math.sqrt( 1.0 - this.axis.z * this.axis.z ),
		);
		d.multiplyScalar( this.radius0 );

		const box1 = new three.Box3( new three.Vector3().subVectors( c, d ), new three.Vector3().addVectors( c, d ) );

		d.divideScalar( this.radius0 );
		d.multiplyScalar( this.radius1 );

		c.addScaledVector( this.axis, this.height );
		const box2 = new three.Box3( new three.Vector3().subVectors( c, d ), new three.Vector3().addVectors( c, d ) );

		box1.union( box2 );

		if ( target != null )
			target.copy( box1 );

		return box1;

	}


	/**
	 * @deprecated Use `ConeFrustum.computeOptimisedDownscalingBoundingCube` instead
	 *
	 * @param {!Vector3} origin		The origin for the current coordinate space
	 *
     * @returns {Float32Array} 		The cube position vertex coordinates as a flat array
     */
	computeOptimisedBoundingCube( origin ) {

	    const attribute = baseCubePositions.clone();

		const r = Math.max( this.radius0, this.radius1 );
		tmpMat.makeScale( r, this.height / 2, r );
		attribute.applyMatrix4( tmpMat );

		tmpVec.set( 0, 1, 0 );
		const angle = tmpVec.angleTo( this.axis );
		tmpVec.cross( this.axis ).normalize();
		if ( tmpVec.length() > 0 ) {

			tmpMat.makeRotationAxis( tmpVec, angle );
			attribute.applyMatrix4( tmpMat );

		}

		tmpVec.copy( this.base ).addScaledVector( this.axis, this.height / 2 ).sub( origin );
	    tmpMat.makeTranslation( tmpVec.x, tmpVec.y, tmpVec.z );
	    attribute.applyMatrix4( tmpMat );

	    return attribute.array;

	}


	/**
	 * @param {!Vector3} center0
	 * @param {!number} radius0
	 * @param {!Vector3} center1
	 * @param {!number} radius1
	 * @param {?Vector3} origin		The origin for the current coordinate space. Can be null.
	 * @param {?number} minScale
	 *
	 * @returns {Float32Array} 		The cube position vertex coordinates as a flat array
	 */
	static computeOptimisedDownscalingBoundingCube( center0, radius0, center1, radius1, origin, minScale ) {

		if ( radius0 > radius1 )
			return this.computeOptimisedDownscalingBoundingCube( center1, radius1, center0, radius0, origin, minScale );

		const facePositionsArray = new Float32Array( [
			// Smaller face
			- 1, - 1, - 1,
			  1, - 1, - 1,
			- 1, - 1,   1,
			  1, - 1,   1,

			// Intermediate face
			- 1, 1, - 1,
			  1, 1, - 1,
			- 1, 1,   1,
			  1, 1,   1,

			// Bigger face
			- 1, 1, - 1,
			  1, 1, - 1,
			- 1, 1,   1,
			  1, 1,   1,
		] );

		const indexes = [
			// Small face
			0, 1, 3,		0, 3, 2,

			// Small to intermediate faces
			6, 4, 0,		6, 0, 2,
			7, 6, 2,		7, 2, 3,
			5, 7, 3,		5, 3, 1,
			4, 5, 1,		4, 1, 0,

			// Intermediate to big faces
			10, 8, 4,		10, 4, 6,
			11, 10, 6,		11, 6, 7,
			9, 11, 7,		 9, 7, 5,
			8, 9, 5,		 8, 5, 4,

			// Big face
			9, 8, 10,		9, 10, 11,
		];

		const toPositions = function () {

			const positions = new Float32Array( indexes.length * 3 );
			for ( let i = 0; i < indexes.length; i ++ ) {

				const p = indexes[ i ] * 3;
				positions[ 3 * i ] = facePositionsArray[ p ];
				positions[ 3 * i + 1 ] = facePositionsArray[ p + 1 ];
				positions[ 3 * i + 2 ] = facePositionsArray[ p + 2 ];

			}

			return positions;

		};

		const tmpVec1 = new three.Vector3().subVectors( center1, center0 );

		if ( tmpVec1.length() === 0 )
			throw "Capsule height must not be zero";

		const sinTheta = ( radius1 - radius0 ) / tmpVec1.length();

		if ( Math.abs( sinTheta ) >= 1 / minScale * 0.9999 ) {

			tmpVec1.addVectors( center0, center1 ).multiplyScalar( 0.5 );
			for ( let i = 0; i < facePositionsArray.length; i += 3 ) {

				facePositionsArray[ i ] = tmpVec1.x;
				facePositionsArray[ i + 1 ] = tmpVec1.y;
				facePositionsArray[ i + 2 ] = tmpVec1.z;

			}

			return toPositions();

		} else if ( Math.abs( sinTheta ) > 1 )
			return this.computeOptimisedDownscalingBoundingCube( center0, minScale * radius0, center1, minScale * radius1, origin, 1 );

		const cosTheta = Math.cos( Math.asin( sinTheta ) );
		const height = tmpVec1.length() + sinTheta * ( radius0 - ( minScale * minScale ) * radius1 );
		const unscaledHeight = tmpVec1.length() + sinTheta * ( radius0 - radius1 );
		tmpVec2.copy( center0 ).addScaledVector( tmpVec1.normalize(), - sinTheta * radius0 );

		const r0 = radius0 * cosTheta;
		const r1 = radius1 * cosTheta;

		let s = r1 > 0 ? r0 / r1 : 1;
		for ( let i = 0; i < 12; i += 3 ) {

			facePositionsArray[ i ] *= s;
			facePositionsArray[ i + 2 ] *= s;

		}

		s = Math.cos( Math.asin( minScale * sinTheta ) ) * radius1 * minScale / r1;
		for ( let i = 24; i < 36; i += 3 ) {

			facePositionsArray[ i ] *= s;
			facePositionsArray[ i + 2 ] *= s;

		}

		const newY = 2 * unscaledHeight / height - 1;
		for ( let i = 12; i < 24; i += 3 )
			facePositionsArray[ i + 1 ] = newY;

		const attribute = new three.BufferAttribute( toPositions(), 3 );

		tmpMat.makeScale( r1, height / 2, r1 );
		attribute.applyMatrix4( tmpMat );

		tmpVec.set( 0, 1, 0 );
		const angle = tmpVec.angleTo( tmpVec1 );
		const dot = tmpVec.dot( tmpVec1 );
		tmpVec.cross( tmpVec1 ).normalize();
		if ( tmpVec.length() > 0 ) {

			tmpMat.makeRotationAxis( tmpVec, angle );
			attribute.applyMatrix4( tmpMat );

		} else if ( dot < 0 ) {

			tmpMat.makeRotationZ( Math.PI );
			attribute.applyMatrix4( tmpMat );

		}

		if ( origin != null ) {

			tmpVec.copy( tmpVec2 ).addScaledVector( tmpVec1, height / 2 ).sub( origin );
			tmpMat.makeTranslation( tmpVec.x, tmpVec.y, tmpVec.z );
			attribute.applyMatrix4( tmpMat );

		}

		return attribute.array;

	}


	/**
     * @param frustum   {!ConeFrustum}
     * @returns {boolean}
     */
	equals( frustum ) {

		return this.base.equals( frustum.base ) &&
            this.axis.equals( frustum.axis ) &&
            this.height === frustum.height &&
            this.radius0 === frustum.radius0 &&
            this.radius1 === frustum.radius1;

	}

}

/*
 * This file encapsulates the xthree library.
 * It checks if the needed three examples and the library are duplicated.
 */

const PACKAGE_NAME = "three-js-cone-frustum";

checkThreeRevision(PACKAGE_NAME, 130);

checkDependancy(PACKAGE_NAME, "ConeFrustum", ConeFrustum);

exports.ConeFrustum = ConeFrustum;
