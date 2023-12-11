import BurstButton from "./BurstButton";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Helloworld extends cc.Component {
    private _title: string = null;
    private get title(): string { return this._title };
    private set title(value: string) {
        this._title = value;
        let titleNode = this.node.getChildByName('Title');
        titleNode.getComponent(cc.Label).string = value;
        titleNode.scaleY = 0;
        cc.tween(titleNode).to(0.1, { scaleY: 1 }).start();
        console.log(value);
    }
    private countNum: number = 0;

    start() {
        let buttons = this.node.getComponentsInChildren(BurstButton);
        for (let i = buttons.length - 1; i > -1; buttons[i--].setCallback(this.callback, this));
    }

    callback(tag: string, event: string, ...parms: any[]) {
        switch (tag) {
            case 'DisableBtn': this.title = '不可交互按钮，点击无效'; break;
            case 'NormalBtn': this.title = `普通按钮${tag}触发${event}`; break;
            case 'BurstBtn':
                switch (event) {
                    case 'press': this.title = `连发按钮${tag}按下`; break;
                    case 'burst': this.title = `开始连发`; break;
                    case 'release': this.title = `连发按钮${tag}抬起`; break;
                    case 'cancel': this.title = `连发按钮${tag}取消`; break;
                }
                break;
            case 'ColorBtn': this.title = `可以设置按下后变色、禁用后变色`; break;
            case 'ImageBtn': this.title = `可以设置按下后换图、禁用后换图`; break;
            case 'DeepBtn': this.title = `无论按钮在哪个目录层级都会触发`; break;
            case 'ExtendBtn': this.title = `实现方式参考编辑器里的目录层级`; break;
            case '+':
                switch (event) {
                    case 'press':
                    case 'burst':
                        this.countNum = Math.min(this.countNum + 1, 10);
                        parms[0].isActive = this.countNum !== 10;
                        cc.find('Count/-', this.node).getComponent(BurstButton).isActive = true;
                        cc.find('Count/Num', this.node).getComponent(cc.Label).string = this.countNum.toString();
                        break;
                }
                this.title = `按住可以连发`;
                break;
            case '-':
                if (event === 'press' || event === 'burst') {
                    this.countNum = Math.max(this.countNum - 1, 0);
                    cc.find('Count/+', this.node).getComponent(BurstButton).isActive = true;
                    parms[0].isActive = this.countNum !== 0;
                    cc.find('Count/Num', this.node).getComponent(cc.Label).string = this.countNum.toString();
                }
                this.title = `按住可以连发`;
                break;
        }
    }
}