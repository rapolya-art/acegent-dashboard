import { Room, RoomEvent, LocalParticipant } from '@livekit/rtc-node';

const room = new Room();
const proto = Object.getPrototypeOf(room);
const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor');
console.log('Room methods:', methods.join(', '));

// Check RoomEvent keys
console.log('RoomEvent keys:', Object.keys(RoomEvent).join(', '));

// Check LocalParticipant
const lpProto = LocalParticipant.prototype;
const lpMethods = Object.getOwnPropertyNames(lpProto).filter(m => m !== 'constructor');
console.log('LocalParticipant methods:', lpMethods.join(', '));
