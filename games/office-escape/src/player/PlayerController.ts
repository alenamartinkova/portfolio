import { CharacterSupportedState, PhysicsCharacterController } from '@babylonjs/core/Physics/v2/characterController';
import { EmployeeModel } from './EmployeeModel';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Factory } from '../world/Factory';
import { Input } from '../systems/Input';
export const PLAYER_HEIGHT = 1.65;
export const WALK_SPEED = 4.1;
export const SPRINT_SPEED = 6.5;
export const JUMP_SPEED = 8.2;
export const GRAVITY = 18;
export class PlayerController {
    controller: PhysicsCharacterController;
    root: TransformNode;
    forward = new Vector3(0, 0, 1);
    grounded = false;
    moving = false;
    onJump = () => { };
    onLand = (_speed: number) => { };
    onGroundContact = (_position: Vector3, _supportDistance: number) => false;
    private coyote = 0;
    private buffer = 0;
    private jumpCooldown = 0;
    private downwardTravel = 0;
    private model: EmployeeModel;
    private oldVelocity = Vector3.Zero();
    private velocity = Vector3.Zero();
    private move = Vector3.Zero();
    private gravity = new Vector3(0, -GRAVITY, 0);
    private down = Vector3.Down();
    constructor(private scene: Scene, f: Factory, spawn: Vector3) {
        this.controller = new PhysicsCharacterController(spawn, { capsuleHeight: PLAYER_HEIGHT, capsuleRadius: .28 }, scene);
        this.controller.characterMass = 7;
        this.controller.characterStrength = 45;
        this.controller.maxSlopeCosine = .7;
        this.root = new TransformNode('employee', scene);
        this.model = new EmployeeModel(f, this.root);
        this.teleport(spawn);
    }
    get position() { return this.controller.getPosition(); }
    get feet() { return this.position.y - PLAYER_HEIGHT / 2; }
    teleport(p: Vector3) { this.controller.setPosition(p); this.controller.setVelocity(Vector3.Zero()); this.root.position.copyFrom(p); this.root.position.y -= PLAYER_HEIGHT / 2; this.coyote = 0; this.buffer = 0; this.jumpCooldown = .15; this.downwardTravel = 0; }
    update(dt: number, input: Input, yaw: number, dragging: boolean) {
        const support = this.controller.checkSupport(dt, this.down);
        const supported = support.supportedState === CharacterSupportedState.SUPPORTED;
        const wasGrounded = this.grounded;
        const oldVelocity = this.oldVelocity.copyFrom(this.controller.getVelocity());
        // Havok support includes its contact skin and this step's travel, so a
        // fixed visual-feet threshold can miss the very surface granting a jump.
        const contactSkin = this.controller.keepDistance + this.controller.keepContactTolerance;
        const supportDistance = contactSkin + this.downwardTravel;
        // Landing hazards take priority over buffered jumps and coyote-time input.
        this.grounded = supported;
        if (supported && this.onGroundContact(this.position, supportDistance)) return;
        if (supported && !wasGrounded && oldVelocity.y < -1)
            this.onLand(-oldVelocity.y);
        this.coyote = supported ? .12 : Math.max(0, this.coyote - dt);
        this.buffer = Math.max(0, this.buffer - dt);
        this.jumpCooldown -= dt;
        if (input.consume('Space'))
            this.buffer = .15;
        const x = input.axis('KeyD', 'KeyA') + input.axis('ArrowRight', 'ArrowLeft');
        const z = input.axis('KeyW', 'KeyS') + input.axis('ArrowUp', 'ArrowDown');
        const move = this.move.set(x * Math.cos(yaw) + z * Math.sin(yaw), 0, z * Math.cos(yaw) - x * Math.sin(yaw));
        this.moving = move.lengthSquared() > 0;
        if (this.moving) {
            move.normalize();
            this.forward.copyFrom(move);
            this.root.rotation.y = Math.atan2(move.x, move.z);
        }
        const speed = dragging ? 2.2 : input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED;
        const desired = move.scaleInPlace(speed);
        const velocity = this.velocity.copyFrom(oldVelocity);
        const blend = 1 - Math.exp(-(supported ? 24 : 13) * dt);
        velocity.x += (desired.x - velocity.x) * blend;
        velocity.z += (desired.z - velocity.z) * blend;
        if (supported && this.jumpCooldown <= 0)
            velocity.y = Math.min(0, velocity.y);
        else
            velocity.y -= GRAVITY * dt;
        if (this.buffer > 0 && this.coyote > 0 && this.jumpCooldown <= 0) {
            velocity.y = JUMP_SPEED;
            this.buffer = 0;
            this.coyote = 0;
            this.jumpCooldown = .25;
            this.grounded = false;
            this.onJump();
        }
        if (supported && support.isSurfaceDynamic) {
            velocity.x += support.averageSurfaceVelocity.x * dt * 3;
            velocity.z += support.averageSurfaceVelocity.z * dt * 3;
        }
        this.controller.setVelocity(velocity);
        // Save the sweep before Havok clips the landing velocity to zero.
        this.downwardTravel = Math.max(0, -velocity.y) * dt;
        this.controller.integrate(dt, support, this.gravity);
        // Mantle only an adjacent ledge with clear headroom and a nearly reachable top.
        if (!supported && input.keys.has('Space') && this.moving && velocity.y < 4) {
            // Integration may have landed this frame. Do not mantle off lava before
            // next frame's support check has a chance to report the contact.
            const landing = this.controller.checkSupport(dt, this.down);
            if (landing.supportedState === CharacterSupportedState.SUPPORTED && this.onGroundContact(this.position, contactSkin + this.downwardTravel)) {
                this.root.position.copyFrom(this.position);
                this.root.position.y -= PLAYER_HEIGHT / 2;
                return;
            }
            const probe = this.position.add(this.forward.scale(.64));
            const hit = this.scene.pickWithRay(new Ray(new Vector3(probe.x, this.feet + 1.1, probe.z), Vector3.Down(), 1.05), m => Boolean(m.metadata?.solid) && !m.metadata?.forbidden);
            if (hit?.hit && hit.pickedPoint && hit.getNormal(true)!.y > .75 && hit.pickedPoint.y > this.feet + .12 && hit.pickedPoint.y < this.feet + .95) {
                const head = this.scene.pickWithRay(new Ray(hit.pickedPoint.add(new Vector3(0, .08, 0)), Vector3.Up(), PLAYER_HEIGHT), m => Boolean(m.metadata?.solid));
                if (!head?.hit) {
                    this.teleport(hit.pickedPoint.add(new Vector3(0, PLAYER_HEIGHT / 2 + .08, 0)));
                    this.onLand(2);
                }
            }
        }
        this.root.position.copyFrom(this.position);
        this.root.position.y -= PLAYER_HEIGHT / 2;
        this.model.update(dt, this.moving, this.grounded, dragging);
    }
}
