/*******************************************************************************
 * 创建: 2023年08月27日
 * 作者: 水煮肉片饭(27185709@qq.com)
 * 描述: 连发按钮
 * 1、BurstButton按下后无论是否移动，都会触发burst事件
 *    连发功能默认关闭，并不会产生额外开销
 * 2、动画（缩放、变色、换图）可以并存
 * 3、可以设置按下、抬起、取消的触发音效
 * 4、优化了事件处理机制，可通过setCallback指定事件回调，建议同一个页面下所有BurstButton指向同一个回调函数
 *    tag：按钮节点name
 *    event：按下Press，连发Burst，抬起Release，取消Cancel
 *    parms[0]：按钮组件对象
*******************************************************************************/
enum EffectType { 无, 变色, 换图 }
const DISABLE_COLOR = cc.color(80, 80, 80);
const { ccclass, property, menu } = cc._decorator;
@ccclass('Audio')
class Audio {
    @property({ displayName: CC_DEV && '按下' })
    press: cc.AudioClip = null;
    @property({ displayName: CC_DEV && '抬起' })
    release: cc.AudioClip = null;
    @property({ displayName: CC_DEV && '取消' })
    cancel: cc.AudioClip = null;
}
@ccclass
@menu('Comp/BurstButton')
export default class BurstButton extends cc.Component {
    @property({ displayName: CC_DEV && '是否连发', tooltip: CC_DEV && '不需要连发的按钮，可以关闭连发减小开销' })
    private isBurst: boolean = false;
    @property({ min: 0, displayName: CC_DEV && '······延迟时间（秒）', tooltip: CC_DEV && '按下几秒后开始连发', visible() { return this.isBurst } })
    private delayTime: number = 0;
    @property({ min: 0, displayName: CC_DEV && '······连发间隔（秒）', tooltip: CC_DEV && '每隔几秒触发一次', visible() { return this.isBurst } })
    private intervalTime: number = 0.1;
    @property({ min: 0, displayName: CC_DEV && '按下后缩放' })
    private pressScale: number = 0.9;
    @property({ type: cc.Enum(EffectType), displayName: CC_DEV && '动画' })
    private effectType: EffectType = EffectType.无;
    @property({ displayName: CC_DEV && '······按下后变色', visible() { return this.effectType === EffectType.变色 } })
    private pressColor: cc.Color = cc.color(255, 255, 255);
    @property({ displayName: CC_DEV && '······禁用后变色', visible() { return this.effectType === EffectType.变色 } })
    private disableColor: cc.Color = DISABLE_COLOR;
    @property({ min: 0, displayName: CC_DEV && '······变色时间（秒）', visible() { return this.effectType === EffectType.变色 } })
    private colorTime: number = 0.2;
    @property
    private _effectSprite: cc.Sprite = null;
    @property({ type: cc.Sprite, displayName: CC_DEV && '······换图对象', tooltip: CC_DEV && '把挂载cc.Sprite的节点拖进来', visible() { return this.effectType === EffectType.换图 } })
    private get effectSprite() { return this._effectSprite }
    private set effectSprite(value: cc.Sprite) {
        if (this._effectSprite === value) return;
        this._effectSprite = value;
        this.updateEffectSprite();
    }
    @property({ type: cc.SpriteFrame, displayName: CC_DEV && '······按下后换图', visible() { return this.effectType === EffectType.换图 } })
    private pressFrame: cc.SpriteFrame = null;
    @property({ type: cc.SpriteFrame, displayName: CC_DEV && '······禁用后换图', visible() { return this.effectType === EffectType.换图 } })
    private disableFrame: cc.SpriteFrame = null;
    @property({ type: Audio, displayName: CC_DEV && '音效', tooltip: CC_DEV && '把需要播放的音效文件拖进来' })
    private audio: Audio = new Audio();
    private _isActive: boolean = true;
    get isActive() { return this._isActive; }
    set isActive(value: boolean) {
        this._isActive = value;
        this.updateActive();
    }
    private normalScale: cc.Vec2 = cc.v2(1, 1);
    private normalFrame: cc.SpriteFrame = null;
    private callback: (tag: string, event: string, ...parms: any[]) => void = () => { };

    protected start() {
        this.normalScale.x = this.node.scaleX;
        this.normalScale.y = this.node.scaleY;
        this.updateEffectSprite();
        this.updateActive();
        this.updateSize();
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this.updateSize, this);
    }

    setCallback(callback: (tag: string, event: string, ...parms: any[]) => void, bind: any) {
        this.callback = callback.bind(bind);
    }

    private updateSize() {
        if (this.node.width === 0 || this.node.height === 0) {
            console.warn(`按钮宽高为0，无法响应触摸事件！(${this.node.parent?.parent?.name}/${this.node.parent?.name}/${this.node.name})`);
        }
    }

    private updateEffectSprite() {
        if (this.effectSprite) {
            this.normalFrame = this.effectSprite.spriteFrame;
            this.effectSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }
    }

    private updateActive() {
        if (this.isActive) {
            switch (this.effectType) {
                case EffectType.变色: this.setColor(this.node, this.colorTime); break;
                case EffectType.换图: this.effectSprite && (this.effectSprite.spriteFrame = this.normalFrame); break;
            }
            this.node.on(cc.Node.EventType.TOUCH_START, this.touchStart, this);
            this.node.on(cc.Node.EventType.TOUCH_END, this.touchEnd, this);
            this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.touchCancel, this);
        } else {
            this.node.scaleX = this.normalScale.x;
            this.node.scaleY = this.normalScale.y;
            this.isBurst && this.unschedule(this.touchBurst);
            switch (this.effectType) {
                case EffectType.变色: this.setColor(this.node, 0, this.disableColor); break;
                case EffectType.换图: this.effectSprite && (this.effectSprite.spriteFrame = this.disableFrame); break;
            }
            this.node.off(cc.Node.EventType.TOUCH_START, this.touchStart, this);
            this.node.off(cc.Node.EventType.TOUCH_END, this.touchEnd, this);
            this.node.off(cc.Node.EventType.TOUCH_CANCEL, this.touchCancel, this);
        }
    }

    private touchStart() {
        this.audio.press && cc.audioEngine.playEffect(this.audio.press, false);
        this.node.scaleX = this.pressScale * this.normalScale.x;
        this.node.scaleY = this.pressScale * this.normalScale.y;
        this.isBurst && this.schedule(this.touchBurst, this.intervalTime, cc.macro.REPEAT_FOREVER, this.delayTime);
        switch (this.effectType) {
            case EffectType.变色: this.setColor(this.node, this.colorTime, this.pressColor); break;
            case EffectType.换图: this.effectSprite && (this.effectSprite.spriteFrame = this.pressFrame); break;
        }
        this.callback(this.node.name, 'Press', this);
    }

    private touchBurst() {
        this.callback(this.node.name, 'Burst', this);
    }

    private touchEnd() {
        this.audio.release && cc.audioEngine.playEffect(this.audio.release, false);
        this.node.scaleX = this.normalScale.x;
        this.node.scaleY = this.normalScale.y;
        this.isBurst && this.unschedule(this.touchBurst);
        switch (this.effectType) {
            case EffectType.变色: this.setColor(this.node, this.colorTime); break;
            case EffectType.换图: this.effectSprite && (this.effectSprite.spriteFrame = this.normalFrame); break;
        }
        this.callback(this.node.name, 'Release', this);
    }

    private touchCancel() {
        this.audio.cancel && cc.audioEngine.playEffect(this.audio.cancel, false);
        this.node.scaleX = this.normalScale.x;
        this.node.scaleY = this.normalScale.y;
        this.isBurst && this.unschedule(this.touchBurst);
        switch (this.effectType) {
            case EffectType.变色: this.setColor(this.node, this.colorTime); break;
            case EffectType.换图: this.effectSprite && (this.effectSprite.spriteFrame = this.normalFrame); break;
        }
        this.callback(this.node.name, 'Cancel', this);
    }

    private setColor(node: cc.Node, time: number, color?: cc.Color) {
        node['colorTween']?.stop();
        if (color === undefined) {
            if (node['defaultColor'] !== undefined) {
                node['colorTween'] = cc.tween(node).to(time, { color: node['defaultColor'] }).call(() => { delete node['defaultColor']; delete node['colorTween']; }).start();
            }
        } else {
            let defaultColor = node['defaultColor'] ??= node.color;
            let changeColor = cc.color(defaultColor.r * color.r / 255, defaultColor.g * color.g / 255, defaultColor.b * color.b / 255);
            time === 0 ? node.color = changeColor : node['colorTween'] = cc.tween(node).to(time, { color: changeColor }).start();
        }
        for (let i = node.childrenCount - 1; i > -1; this.setColor(node.children[i--], time, color));
    }

    protected onDestroy() {
        this.node.off(cc.Node.EventType.SIZE_CHANGED, this.updateSize, this);
        this.node.off(cc.Node.EventType.TOUCH_START, this.touchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this.touchEnd, this);
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this.touchCancel, this);
    }
}