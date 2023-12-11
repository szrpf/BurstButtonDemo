/*******************************************************************************
 * 创建: 2023年08月27日
 * 作者: 水煮肉片饭(27185709@qq.com)
 * 描述: 连发按钮
 * 1、BurstButton按下后无论是否移动，都会触发burst事件
 *    连发功能默认关闭，并不会产生额外开销
 * 2、交互动画（缩放、变色、换图）可以并存
 * 3、可以设置按下、抬起、取消的触发音效
 * 4、优化了事件处理机制，可通过setCallback指定事件回调，建议同一个页面下所有BurstButton指向同一个回调函数
 *    tag：按钮节点name
 *    event：按下press，连发burst，抬起release，取消cancel
 *    parms[0]：按钮对象
*******************************************************************************/
const { ccclass, property, menu } = cc._decorator;
@ccclass('Audio')
class Audio {
    @property({ type: cc.AudioClip, displayName: CC_DEV && '按下', tooltip: CC_DEV && '按下时触发' })
    press: cc.AudioClip = null;
    @property({ type: cc.AudioClip, displayName: CC_DEV && '抬起', tooltip: CC_DEV && '抬起时触发' })
    release: cc.AudioClip = null;
    @property({ type: cc.AudioClip, displayName: CC_DEV && '取消', tooltip: CC_DEV && '按钮外抬起时触发' })
    cancel: cc.AudioClip = null;
}
@ccclass
@menu('Comp/BurstButton')
export default class BurstButton extends cc.Component {
    @property
    private _isActive: boolean = true;
    @property({ displayName: CC_DEV && '是否激活' })
    get isActive() { return this._isActive; }
    set isActive(value: boolean) {
        this._isActive = value;
        this.updateActive();
    }
    @property({ displayName: CC_DEV && '是否连发', tooltip: CC_DEV && '不需要连发的按钮，可以关闭连发减小开销' })
    private isBurst: boolean = false;
    @property({ min: 0, displayName: CC_DEV && '······延迟时间（秒）', tooltip: CC_DEV && '按下几秒后开始连发', visible() { return this.isBurst } })
    private delayTime: number = 0;
    @property({ min: 0, displayName: CC_DEV && '······连发间隔（秒）', tooltip: CC_DEV && '每隔几秒触发一次', visible() { return this.isBurst } })
    private intervalTime: number = 0.1;
    @property({ min: 0, displayName: CC_DEV && '按下后缩放' })
    private pressScale: number = 0.9;
    @property({ displayName: CC_DEV && '按下后变色' })
    private pressColor: cc.Color = cc.color(255, 255, 255);
    @property({ displayName: CC_DEV && '禁用后变色' })
    private disableColor: cc.Color = cc.color(100, 100, 100);
    @property
    private _effectNode: cc.Node = null;
    @property({ type: cc.Node, displayName: CC_DEV && '动画节点', tooltip: CC_DEV && '换图动画作用于哪个节点' })
    get effectNode() { return this._effectNode }
    set effectNode(value: cc.Node) {
        this._effectNode = value;
        this.updateEffectNode();
    }
    @property({ type: cc.SpriteFrame, displayName: CC_DEV && '······按下后换图', visible() { return this.effectNode !== null } })
    private pressFrame: cc.SpriteFrame = null;
    @property({ type: cc.SpriteFrame, displayName: CC_DEV && '······禁用后换图', visible() { return this.effectNode !== null } })
    private disableFrame: cc.SpriteFrame = null;
    @property({ type: Audio, displayName: CC_DEV && '音效', tooltip: CC_DEV && '把需要播放的音效文件拖进来' })
    private audio: Audio = new Audio();
    private effectSprite: cc.Sprite = null;
    private normalScale: number = 1;
    private normalFrame: cc.SpriteFrame = null;
    private callback: (tag: string, event: string, ...parms: any[]) => void = () => { };

    protected start() {
        this.normalScale = this.node.scale;
        this.updateSize();
        this.updateEffectNode();
        this.updateActive();
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this.updateSize, this);
    }

    setCallback(callback: (tag: string, event: string, ...parms: any[]) => void, bind: any) {
        this.callback = callback.bind(bind);
    }

    private updateSize() {
        if (this.node.width === 0 || this.node.height === 0) {
            console.warn(`按钮宽高为0，无法响应触摸事件！(${this.node?.parent?.parent.name}/${this.node?.parent.name}/${this.node.name})`);
        }
    }

    private updateEffectNode() {
        if (this.effectNode) {
            this.effectSprite = this.effectNode.getComponent(cc.Sprite);
            this.normalFrame = this.effectSprite?.spriteFrame;
            if (this.effectSprite === null) {
                console.warn(`动画节点没有cc.Sprite，无法换图！(${this.node?.parent?.parent.name}/${this.node?.parent.name}/${this.node.name})`);
            }
        }
    }

    private updateActive() {
        if (this.isActive) {
            this.setColor(this.node, cc.color(255, 255, 255));
            this.effectNode && this.effectSprite && this.normalFrame && (this.effectSprite.spriteFrame = this.normalFrame);
            this.node.on(cc.Node.EventType.TOUCH_START, this.touchStart, this);
            this.node.on(cc.Node.EventType.TOUCH_END, this.touchEnd, this);
            this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.touchCancel, this);
        } else {
            this.isBurst && this.unschedule(this.touchBurst);
            this.setColor(this.node, this.disableColor);
            this.effectNode && this.effectSprite && this.disableFrame && (this.effectSprite.spriteFrame = this.disableFrame);
            this.node.scale = this.normalScale;
            this.node.off(cc.Node.EventType.TOUCH_START, this.touchStart, this);
            this.node.off(cc.Node.EventType.TOUCH_END, this.touchEnd, this);
            this.node.off(cc.Node.EventType.TOUCH_CANCEL, this.touchCancel, this);
        }
    }

    private touchBurst() {
        this.callback(this.node.name, 'burst', this);
    }

    private touchStart() {
        this.isBurst && this.schedule(this.touchBurst, this.intervalTime, cc.macro.REPEAT_FOREVER, this.delayTime);
        this.setColor(this.node, this.pressColor);
        this.effectNode && this.effectSprite && this.pressFrame && (this.effectSprite.spriteFrame = this.pressFrame);
        this.node.scale = this.pressScale * this.normalScale;
        this.audio.press && cc.audioEngine.playEffect(this.audio.press, false);
        this.callback(this.node.name, 'press', this);
    }

    private touchEnd() {
        this.isBurst && this.unschedule(this.touchBurst);
        this.setColor(this.node, cc.color(255, 255, 255));
        this.effectNode && this.effectSprite && this.normalFrame && (this.effectSprite.spriteFrame = this.normalFrame);
        this.node.scale = this.normalScale;
        this.audio.release && cc.audioEngine.playEffect(this.audio.release, false);
        this.callback(this.node.name, 'release', this);
    }

    private touchCancel() {
        this.isBurst && this.unschedule(this.touchBurst);
        this.setColor(this.node, cc.color(255, 255, 255));
        this.effectNode && this.effectSprite && this.normalFrame && (this.effectSprite.spriteFrame = this.normalFrame);
        this.node.scale = this.normalScale;
        this.audio.cancel && cc.audioEngine.playEffect(this.audio.cancel, false);
        this.callback(this.node.name, 'cancel', this);
    }

    private setColor(node: cc.Node, color: cc.Color) {
        if (node.color === color) return;
        node.color = color;
        for (let i = node.childrenCount - 1; i > -1; this.setColor(node.children[i--], color));
    }

    protected onDestroy() {
        this.node.targetOff(this);
    }
}