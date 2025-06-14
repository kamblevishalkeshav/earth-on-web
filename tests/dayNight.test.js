import assert from 'assert';
import { gmstFromJD, sunECI } from '../js/drawDayNight.js';

function run() {
  const jd = 2451545.0; // J2000 epoch
  const gmst = gmstFromJD(jd);
  assert(gmst >= 0 && gmst < 2 * Math.PI, 'gmst within 0-2pi');

  const sun = sunECI(jd);
  const len = Math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z);
  assert(Math.abs(len - 1) < 1e-6, 'sun vector normalized');
  ['x','y','z'].forEach(k => {
    assert(sun[k] <= 1 && sun[k] >= -1, 'component in range');
  });

  console.log('All tests passed');
}

run();

