const THREE = require( "three-full" );

const Box3 = THREE.Box3;
const Vector3 = THREE.Vector3;
const Matrix4 = THREE.Matrix4;
const BoxBufferGeometry = THREE.BoxBufferGeometry;

const tmpVec = new Vector3();
const tmpMat = new Matrix4();
const baseCubePositions = new BoxBufferGeometry( 2, 2, 2 ).toNonIndexed().attributes.position;

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

		this.base = base || new Vector3();

		this.axis = axis || new Vector3( 0, 1, 0 );
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

		const axis = new Vector3().subVectors( center1, center0 );

		if ( axis.length() === 0 )
			throw "Capsule height must not be zero";

		const sinTheta = ( radius1 - radius0 ) / axis.length();
		const height = axis.length() + sinTheta * ( radius0 - radius1 );
		const base = new Vector3().copy( center0 ).addScaledVector( axis.normalize(), - sinTheta * radius0 );
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
		const d = new Vector3();

		d.set(
			Math.sqrt( 1.0 * this.axis.x * this.axis.x ),
			Math.sqrt( 1.0 * this.axis.y * this.axis.y ),
			Math.sqrt( 1.0 * this.axis.z * this.axis.z ),
		);
		d.multiplyScalar( this.radius0 );

		const box1 = new Box3( new Vector3().subVectors( c, d ), new Vector3().addVectors( c, d ) );

		d.divideScalar( this.radius0 );
		d.multiplyScalar( this.radius1 );

		c.addScaledVector( this.axis, this.height );
		const box2 = new Box3( new Vector3().subVectors( c, d ), new Vector3().addVectors( c, d ) );

		box1.union( box2 );

		if ( target != null )
			target.copy( box1 );

		return box1;

	}


	/**
	 * @param {!Vector3} origin		The origin for the current coordinate space
	 *
     * @returns {Float32Array} 		The cube position vertex coordinates as a flat array
     */
	computeOptimisedBoundingCube( origin ) {

	    const attribute = baseCubePositions.clone();

		const r = Math.max( this.radius0, this.radius1 );
		tmpMat.makeScale( r, this.height / 2, r );
		tmpMat.applyToBufferAttribute( attribute );

		tmpVec.set( 0, 1, 0 );
		const angle = tmpVec.angleTo( this.axis );
		tmpVec.cross( this.axis ).normalize();
		if ( tmpVec.length() > 0 ) {

			tmpMat.makeRotationAxis( tmpVec, angle );
			tmpMat.applyToBufferAttribute( attribute );

		}

		tmpVec.copy( this.base ).addScaledVector( this.axis, this.height / 2 ).sub( origin );
	    tmpMat.makeTranslation( tmpVec.x, tmpVec.y, tmpVec.z );
	    tmpMat.applyToBufferAttribute( attribute );

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


THREE.ConeFrustum = ConeFrustum;


THREE.Ray.prototype.intersectsConeFrustum = function () {

	const D = new Vector3();
	const target2 = new Vector3();
	const u = new Vector3();

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
