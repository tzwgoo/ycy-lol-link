/**
 * DG-Lab 设备通信类型定义
 * 共享类型 - 前后端通用
 */
/**
 * 消息类型枚举
 */
export var MessageType;
(function (MessageType) {
    MessageType["HEARTBEAT"] = "heartbeat";
    MessageType["BIND"] = "bind";
    MessageType["MSG"] = "msg";
    MessageType["BREAK"] = "break";
    MessageType["ERROR"] = "error";
})(MessageType || (MessageType = {}));
/**
 * 返回码枚举
 */
export var RetCode;
(function (RetCode) {
    RetCode["SUCCESS"] = "200";
    RetCode["CLIENT_DISCONNECTED"] = "209";
    RetCode["INVALID_CLIENT_ID"] = "210";
    RetCode["SERVER_DELAY"] = "211";
    RetCode["ID_ALREADY_BOUND"] = "400";
    RetCode["TARGET_CLIENT_NOT_FOUND"] = "401";
    RetCode["INCOMPATIBLE_RELATIONSHIP"] = "402";
    RetCode["NON_JSON_CONTENT"] = "403";
    RetCode["RECIPIENT_NOT_FOUND"] = "404";
    RetCode["MESSAGE_TOO_LONG"] = "405";
    RetCode["SERVER_INTERNAL_ERROR"] = "500";
})(RetCode || (RetCode = {}));
/**
 * 消息数据头枚举
 */
export var MessageDataHead;
(function (MessageDataHead) {
    MessageDataHead["TARGET_ID"] = "targetId";
    MessageDataHead["DG_LAB"] = "DGLAB";
    MessageDataHead["STRENGTH"] = "strength";
    MessageDataHead["PULSE"] = "pulse";
    MessageDataHead["CLEAR"] = "clear";
    MessageDataHead["FEEDBACK"] = "feedback";
})(MessageDataHead || (MessageDataHead = {}));
/**
 * 强度操作类型枚举
 */
export var StrengthOperationType;
(function (StrengthOperationType) {
    StrengthOperationType[StrengthOperationType["DECREASE"] = 0] = "DECREASE";
    StrengthOperationType[StrengthOperationType["INCREASE"] = 1] = "INCREASE";
    StrengthOperationType[StrengthOperationType["SET_TO"] = 2] = "SET_TO";
})(StrengthOperationType || (StrengthOperationType = {}));
/**
 * 反馈按钮枚举
 */
export var FeedbackButton;
(function (FeedbackButton) {
    FeedbackButton[FeedbackButton["A1"] = 0] = "A1";
    FeedbackButton[FeedbackButton["A2"] = 1] = "A2";
    FeedbackButton[FeedbackButton["A3"] = 2] = "A3";
    FeedbackButton[FeedbackButton["A4"] = 3] = "A4";
    FeedbackButton[FeedbackButton["A5"] = 4] = "A5";
    FeedbackButton[FeedbackButton["B1"] = 5] = "B1";
    FeedbackButton[FeedbackButton["B2"] = 6] = "B2";
    FeedbackButton[FeedbackButton["B3"] = 7] = "B3";
    FeedbackButton[FeedbackButton["B4"] = 8] = "B4";
    FeedbackButton[FeedbackButton["B5"] = 9] = "B5";
})(FeedbackButton || (FeedbackButton = {}));
/**
 * 通道枚举
 */
export var Channel;
(function (Channel) {
    Channel[Channel["A"] = 1] = "A";
    Channel[Channel["B"] = 2] = "B";
})(Channel || (Channel = {}));
