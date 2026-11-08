/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

type RoadAxis = 'horizontal' | 'vertical';
type LightState = 'green' | 'yellow' | 'red';

interface RouteSignal {
  id: number;
  distance: number;
  axis: RoadAxis;
}

interface RouteSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  signal: RouteSignal;
}

interface TrafficRoute {
  segments: RouteSegment[];
  totalLength: number;
}

interface TrafficCar {
  group: THREE.Group;
  routeIndex: number;
  distance: number;
  speed: number;
  cruiseSpeed: number;
  collisionBox: THREE.Box3;
  paint: THREE.MeshStandardMaterial;
}

interface SignalVisual {
  index: number;
  axis: RoadAxis;
  bulbs: THREE.Mesh[];
  materials: THREE.MeshStandardMaterial[];
}

/**
 * Lightweight procedural city traffic.
 *
 * Cars follow two opposing lanes around the existing rectangular road loop.
 * Each lane has four timed signals. Collision boxes are exposed to the
 * vehicle physics so the player's car can make contact with traffic.
 */
export class TrafficSystem {
  public readonly group = new THREE.Group();
  public readonly collisionBoxes: THREE.Box3[] = [];

  private readonly routes: TrafficRoute[];
  private readonly cars: TrafficCar[] = [];
  private readonly signals: SignalVisual[] = [];
  private elapsed = 0;

  private readonly bodyGeometry = new THREE.BoxGeometry(2.05, 0.68, 4.25);
  private readonly cabinGeometry = new THREE.BoxGeometry(1.55, 0.66, 2.05);
  private readonly wheelGeometry: THREE.CylinderGeometry;
  private readonly lampSphereGeometry = new THREE.SphereGeometry(0.17, 10, 8);
  private readonly poleGeometry = new THREE.CylinderGeometry(0.12, 0.16, 4.6, 8);
  private readonly signalHousingGeometry = new THREE.BoxGeometry(0.72, 1.75, 0.58);
  private readonly wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x17191d,
    roughness: 0.92,
  });
  private readonly glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x172638,
    metalness: 0.35,
    roughness: 0.18,
  });
  private readonly signalHousingMaterial = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.25,
    roughness: 0.7,
  });
  private readonly poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.75,
    roughness: 0.35,
  });
  private readonly headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.8,
  });
  private readonly tailLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.5,
  });

  constructor() {
    this.wheelGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12);
    this.wheelGeometry.rotateZ(Math.PI / 2);

    this.routes = this.createRoutes();
    this.createTrafficLights();
    this.createCars();
    this.update(0);
  }

  private createRoutes(): TrafficRoute[] {
    // Clockwise lane: right-hand side of the north, east, south and west roads.
    const clockwise: Array<[number, number]> = [
      [-192.4, -152.4],
      [87.6, -152.4],
      [87.6, 157.6],
      [-192.4, 157.6],
    ];

    // Counter-clockwise lane: offset to the opposite side of each road.
    const counterClockwise: Array<[number, number]> = [
      [-192.4, -157.6],
      [-192.4, 162.4],
      [87.6, 162.4],
      [87.6, -157.6],
    ];

    const definitions = [
      {
        points: clockwise,
        signals: [
          { id: 0, distance: 192.4, axis: 'horizontal' as const },
          { id: 1, distance: 152.4, axis: 'vertical' as const },
          { id: 2, distance: 87.6, axis: 'horizontal' as const },
          { id: 3, distance: 157.6, axis: 'vertical' as const },
        ],
      },
      {
        points: counterClockwise,
        signals: [
          { id: 3, distance: 157.6, axis: 'vertical' as const },
          { id: 2, distance: 192.4, axis: 'horizontal' as const },
          { id: 1, distance: 162.4, axis: 'vertical' as const },
          { id: 0, distance: 87.6, axis: 'horizontal' as const },
        ],
      },
    ];

    return definitions.map(({ points, signals }) => {
      const segments = points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        const start = new THREE.Vector3(point[0], 0, point[1]);
        const end = new THREE.Vector3(next[0], 0, next[1]);
        const difference = end.clone().sub(start);
        const length = difference.length();

        return {
          start,
          end,
          direction: difference.normalize(),
          length,
          signal: signals[index],
        };
      });

      return {
        segments,
        totalLength: segments.reduce((sum, segment) => sum + segment.length, 0),
      };
    });
  }

  private createTrafficLights() {
    // Each signal is placed beside one of the four intersections used by traffic.
    const placements: Array<{ x: number; z: number; axis: RoadAxis }> = [
      { x: 13.5, z: -168, axis: 'horizontal' },
      { x: 104, z: 0, axis: 'vertical' },
      { x: -13.5, z: 173, axis: 'horizontal' },
      { x: -208, z: 0, axis: 'vertical' },
    ];

    placements.forEach((placement, index) => {
      const signalGroup = new THREE.Group();
      signalGroup.position.set(placement.x, 0, placement.z);

      const pole = new THREE.Mesh(this.poleGeometry, this.poleMaterial);
      pole.position.y = 2.3;
      signalGroup.add(pole);

      const housing = new THREE.Mesh(
        this.signalHousingGeometry,
        this.signalHousingMaterial
      );
      housing.position.set(0, 4.9, 0);
      signalGroup.add(housing);

      const colors = [
        { color: 0xef4444, emissive: 0x7f1d1d },
        { color: 0xfacc15, emissive: 0x854d0e },
        { color: 0x22c55e, emissive: 0x14532d },
      ];

      const bulbs: THREE.Mesh[] = [];
      const materials: THREE.MeshStandardMaterial[] = [];

      colors.forEach((light, lightIndex) => {
        const material = new THREE.MeshStandardMaterial({
          color: light.color,
          emissive: light.emissive,
          emissiveIntensity: 0.12,
          roughness: 0.3,
        });
        const bulb = new THREE.Mesh(this.lampSphereGeometry, material);
        bulb.position.set(0, 5.48 - lightIndex * 0.58, 0.31);
        signalGroup.add(bulb);
        bulbs.push(bulb);
        materials.push(material);
      });

      // Small back plate makes the signal readable from the road.
      const rearPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.0, 0.12),
        this.signalHousingMaterial
      );
      rearPlate.position.set(0, 4.9, -0.29);
      signalGroup.add(rearPlate);

      this.group.add(signalGroup);
      this.signals.push({
        index,
        axis: placement.axis,
        bulbs,
        materials,
      });
    });
  }

  private createCars() {
    const colors = [
      0x16a3ff,
      0xe11d48,
      0xf59e0b,
      0x22c55e,
      0x8b5cf6,
      0xeab308,
      0xf8fafc,
      0x14b8a6,
      0xf97316,
      0xec4899,
    ];

    this.routes.forEach((route, routeIndex) => {
      const carsPerRoute = 5;

      for (let index = 0; index < carsPerRoute; index++) {
        const color = colors[routeIndex * carsPerRoute + index];
        const group = new THREE.Group();
        const paint = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.62,
          roughness: 0.24,
        });

        const body = new THREE.Mesh(this.bodyGeometry, paint);
        body.position.y = 0.78;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        const cabin = new THREE.Mesh(this.cabinGeometry, this.glassMaterial);
        cabin.position.set(0, 1.42, -0.12);
        cabin.castShadow = true;
        group.add(cabin);

        const frontBumper = new THREE.Mesh(
          new THREE.BoxGeometry(1.9, 0.2, 0.18),
          this.wheelMaterial
        );
        frontBumper.position.set(0, 0.48, 2.12);
        group.add(frontBumper);

        const rearBumper = frontBumper.clone();
        rearBumper.position.z = -2.12;
        group.add(rearBumper);

        for (const x of [-0.94, 0.94]) {
          for (const z of [-1.38, 1.38]) {
            const wheel = new THREE.Mesh(this.wheelGeometry, this.wheelMaterial);
            wheel.position.set(x, 0.43, z);
            wheel.castShadow = true;
            group.add(wheel);
          }
        }

        const headlights = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.12, 0.06),
          this.headlightMaterial
        );
        headlights.position.set(0, 0.82, 2.14);
        group.add(headlights);

        const tailLights = new THREE.Mesh(
          new THREE.BoxGeometry(1.45, 0.12, 0.06),
          this.tailLightMaterial
        );
        tailLights.position.set(0, 0.82, -2.14);
        group.add(tailLights);

        const collisionBox = new THREE.Box3();
        const car: TrafficCar = {
          group,
          routeIndex,
          distance: (index / carsPerRoute) * route.totalLength,
          speed: 0,
          cruiseSpeed: 10.5 + (index % 3) * 1.25,
          collisionBox,
          paint,
        };

        this.cars.push(car);
        this.collisionBoxes.push(collisionBox);
        this.group.add(group);
      }
    });
  }

  private getLightState(index: number, axis: RoadAxis): LightState {
    // A complete cycle is 18 seconds: 7s green, 2s yellow, 7s crossing green, 2s yellow.
    const phase = (this.elapsed + index * 2.25) % 18;

    if (axis === 'horizontal') {
      if (phase < 7) return 'green';
      if (phase < 9) return 'yellow';
      return 'red';
    }

    if (phase < 9) return 'red';
    if (phase < 16) return 'green';
    return 'yellow';
  }

  private updateTrafficLights() {
    this.signals.forEach((signal) => {
      const state = this.getLightState(signal.index, signal.axis);
      const activeIndex = state === 'red' ? 0 : state === 'yellow' ? 1 : 2;

      signal.materials.forEach((material, index) => {
        material.emissiveIntensity = index === activeIndex ? 2.4 : 0.08;
      });
    });
  }

  private getSegmentAtDistance(route: TrafficRoute, distance: number) {
    let remaining = distance;

    for (let index = 0; index < route.segments.length; index++) {
      const segment = route.segments[index];
      if (remaining <= segment.length || index === route.segments.length - 1) {
        return { segment, segmentIndex: index, localDistance: remaining };
      }
      remaining -= segment.length;
    }

    return {
      segment: route.segments[0],
      segmentIndex: 0,
      localDistance: 0,
    };
  }

  public update(delta: number) {
    const dt = Math.min(Math.max(delta, 0), 0.06);
    // Time runs slowly in the showroom too, so traffic is visible behind the menus.
    this.elapsed += dt;
    this.updateTrafficLights();

    this.cars.forEach((car) => {
      const route = this.routes[car.routeIndex];
      const { segment, localDistance } = this.getSegmentAtDistance(
        route,
        car.distance
      );

      let targetSpeed = car.cruiseSpeed;
      const distanceToSignal = segment.signal.distance - localDistance;

      if (distanceToSignal > 0 && distanceToSignal < 28) {
        const lightState = this.getLightState(
          segment.signal.id,
          segment.signal.axis
        );

        if (lightState !== 'green') {
          const brakingDistance = Math.max(0, distanceToSignal - 8);
          targetSpeed = Math.min(
            targetSpeed,
            Math.sqrt(2 * 5.5 * brakingDistance)
          );
        }
      }

      // Keep a safe gap to the next vehicle on the same loop.
      for (const other of this.cars) {
        if (other === car || other.routeIndex !== car.routeIndex) continue;
        const gap =
          (other.distance - car.distance + route.totalLength) %
          route.totalLength;

        if (gap > 0.5 && gap < 13) {
          targetSpeed = Math.min(
            targetSpeed,
            Math.max(0, other.speed - (13 - gap) * 1.2)
          );
        }
      }

      const braking = targetSpeed < car.speed;
      const response = braking ? 7.5 : 2.2;
      car.speed = THREE.MathUtils.damp(car.speed, targetSpeed, response, dt);

      let advance = car.speed * dt;
      // Hard stop before the line if the signal is not green.
      if (distanceToSignal > 0 && distanceToSignal < 9) {
        const lightState = this.getLightState(
          segment.signal.id,
          segment.signal.axis
        );
        if (lightState !== 'green') {
          advance = Math.min(advance, Math.max(0, distanceToSignal - 8));
          if (advance <= 0.001) car.speed = 0;
        }
      }

      car.distance = (car.distance + advance) % route.totalLength;

      const next = this.getSegmentAtDistance(route, car.distance);
      const x =
        next.segment.start.x +
        next.segment.direction.x * next.localDistance;
      const z =
        next.segment.start.z +
        next.segment.direction.z * next.localDistance;
      const heading = Math.atan2(
        next.segment.direction.x,
        next.segment.direction.z
      );

      car.group.position.set(x, 0, z);
      car.group.rotation.y = heading;
      car.group.updateMatrixWorld(true);
      car.collisionBox.setFromObject(car.group);
    });
  }

  public dispose() {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Shared geometry is disposed once below; only per-car paint and
        // per-signal light materials need individual cleanup here.
        if (object.material instanceof THREE.Material) {
          const material = object.material;
          if (
            material !== this.wheelMaterial &&
            material !== this.glassMaterial &&
            material !== this.signalHousingMaterial &&
            material !== this.poleMaterial &&
            material !== this.headlightMaterial &&
            material !== this.tailLightMaterial
          ) {
            material.dispose();
          }
        }
      }
    });

    this.bodyGeometry.dispose();
    this.cabinGeometry.dispose();
    this.wheelGeometry.dispose();
    this.lampSphereGeometry.dispose();
    this.poleGeometry.dispose();
    this.signalHousingGeometry.dispose();
    this.wheelMaterial.dispose();
    this.glassMaterial.dispose();
    this.signalHousingMaterial.dispose();
    this.poleMaterial.dispose();
    this.headlightMaterial.dispose();
    this.tailLightMaterial.dispose();
  }
}
