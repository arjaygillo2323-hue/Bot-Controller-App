export const CommandType = {
  FORWARD: "FORWARD",
  BACKWARD: "BACKWARD",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  STOP: "STOP",
  MODE_MANUAL: "MODE_MANUAL",
  MODE_AUTO: "MODE_AUTO",
  SPEED: "SPEED",
  ARM_GRAB: "ARM_GRAB",
  ARM_RELEASE: "ARM_RELEASE",
  ARM_HOME: "ARM_HOME",
};

export function serializeCommand(command) {
  if (command.type === CommandType.SPEED && command.value !== undefined) {
    return `SPEED_${command.value}`;
  }
  return command.type;
}