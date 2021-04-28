import THREE from "@dualbox/three";


THREE.Ray.prototype.intersectsConeFrustum = function () {

    const D = new THREE.Vector3();
    const target2 = new THREE.Vector3();
    const u = new THREE.Vector3();

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
