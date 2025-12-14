export enum DeviceVersion {
    V2 = 2,
    V3 = 3,
    SIMULATOR = 100,
}

// 保留旧名称以保持向后兼容
export const CoyoteDeviceVersion = DeviceVersion;

export enum ConnectorType {
    DGLAB = 'DGLab',
    BLE_V2 = 'BLEV2',
    BLE_V3 = 'BLEV3',
}