var RoomHandler = require('roomHandler');
var gameDefine = require('gameDefine');


cc.Class({
    extends: cc.Component,

    properties: {
        //dissolveText: cc.Label,
        headerNode: cc.Node,
        agreeWaitNode: cc.Node,
        agreeBtn: cc.Node,
        disAgreeBtn: cc.Node,
        dissolvePerson: cc.Label,
        lastTimeLabel: cc.Label,
    },

    // use this for initialization
    onLoad: function () {
        this.initHeaderUI();
        registEvent('onRoomDissolve', this, this.showDissolveText);
        this.lastTimeLabel.string = '';

        if (GameData.game.onRoomDissolve != null)
            if (GameData.client.gameType == gameDefine.GameType.Game_Mj_Tianjin) {
                sendEvent('onRoomDissolve', GameData.game.onRoomDissolve);
            }
        this.openDisAgree = false;
        registEvent('onJoinerLost', this, this.showJoinerLost);
        registEvent('onJoinerConnect', this, this.showJoinerConnect);
    },

    onDestroy: function () {
        unregistEvent('onRoomDissolve', this, this.showDissolveText);
        unregistEvent('onJoinerLost', this, this.showJoinerLost);
        unregistEvent('onJoinerConnect', this, this.showJoinerConnect);
    },

    initHeaderUI: function () {
        for (var i = 0; i < GameData.room.joinermax - 1; i++) {
            var index = i + 1;
            var hNode = cc.instantiate(this.headerNode);
            hNode.parent = this.headerNode.parent;
            hNode.name = 'header_' + (i + 2);
            hNode.x = this.headerNode.x + (i + 1) * 200;
        };
    },

    showPlayers: function () {
        if (GameData.room.joinermax) {
            for (var i = 0; i < GameData.room.joinermax; i++) {
                var index = i + 1;
                var joiner = GameData.joiners[i];
                if (joiner != null) {
                    var uid = joiner.uid;
                    var headimgurl = joiner.headimgurl;
                    this.showHeaderIcon(index, headimgurl);
                    this.showHeaderName(index, joiner.name);
                    if (joiner.status == 2) {
                        console.log('joiner.status ==' + joiner.status);
                        var disNode = cc.find('header_' + index + '/lost', this.headerNode.parent);
                        disNode.active = true;
                    }
                }
            }
        }

    },

    showHeaderName: function (index, nameStr) {
        var nameNode = cc.find('header_' + index + '/nameLabel', this.headerNode.parent);
        nameNode.getComponent(cc.Label).string = getShortStr(nameStr, 4);
    },

    showAgreeIcon: function (index, show) {
        var node = cc.find('header_' + index + '/duigou', this.headerNode.parent);
        node.active = show;
    },


    showHeaderIcon: function (index, headimgurl) {
        if (headimgurl == undefined || headimgurl == '') {
            return;
        }

        var self = this;
        cc.loader.load({
            url: headimgurl,
            type: 'png'
        }, function (error, texture) {
            if (!error && texture) { //cc.log('roomdissolve :'+headimgurl+index);
                var iconNode = cc.find('header_' + index + '/headimg', self.headerNode.parent);
                iconNode.getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(texture);
            }
        });
    },

    alreadyAgree: function (act) {
        this.agreeWaitNode.active = !act;
        this.agreeBtn.active = act;
        this.disAgreeBtn.active = act;
    },

    handleSomebodyDisagree: function (uid) {
        if (uid == GameData.player.uid) {
            return;
        }

        if (this.openDisAgree) {
            return;
        }
        var self = this;
        for (var i = 0; i < GameData.joiners.length; i++) {
            var joiner = GameData.joiners[i];
            if (joiner && joiner.uid == uid) {
                var name = joiner.name;
                createMessageBox('因［' + name + '］拒绝解散房间，游戏需继续进行', function () {
                    self.openDisAgree = false
                });
                this.openDisAgree = true;
                return;
            }
        }
    },
    resetUI: function () {
        this.agreeWaitNode.active = false;
        for (var i = 0; i < GameData.room.joinermax; i++) {
            this.showAgreeIcon(i + 1, false);
        }
    },

    showDissolveText: function (data) {
        GameData.showResult = false;
        var dissolove = data.detail;
        var disagreeNum = 0;
        this.alreadyAgree(true);
        this.resetUI();
        var isDis = dissolove.isStart;
        this.showPlayers();
        for (var uid in dissolove.select) {
            var text = '';

            var index = 0;
            for (var i = 0; i < GameData.joiners.length; i++) {
                var joiner = GameData.joiners[i];
                if (joiner && joiner.uid == uid) {
                    index = i + 1;
                    break;
                };
            };

            if (dissolove.select[uid] == 'apply') {
                text = '申请解散房间';
                for (var i = 0; i < GameData.joiners.length; i++) {
                    var joiner = GameData.joiners[i];
                    if (joiner && joiner.uid == uid) {
                        this.dissolvePerson.string = '[' + joiner.name + ']发起投票解散对局';
                    };
                };
                this.showAgreeIcon(index, true);
            } else if (dissolove.select[uid] == 'agree') {
                text = '同意解散房间';
                this.showAgreeIcon(index, true);
            } else if (dissolove.select[uid] == 'disagree') {
                text = '拒绝解散房间';
                disagreeNum++;
                this.node.getComponent('roomMain').showdissolveLayer(1, 0);
                this.handleSomebodyDisagree(uid);
                return;
            }

            if ((dissolove.select[uid] == 'agree' || dissolove.select[uid] == 'apply') && uid == GameData.player.uid) {
                this.alreadyAgree(false);
            }
        }
        if (dissolove == null || Object.keys(dissolove).length <= 0) {
            return;
        } else {
            this.node.getComponent('roomMain').showdissolveLayer(1, 1);
        }
        this.handleVoteResult(isDis);
        this.handleRoomDisbandTimer(dissolove);
    },

    handleVoteResult: function (data) {
        if (data == false) {
            var self = this;
            this.node.getComponent('roomMain').showdissolveLayer(1, 0);
            var seq = cc.sequence(cc.delayTime(0.1), cc.callFunc(function () {
                self.node.getComponent('roomMain').shutDissolveLayer();
            }));
            this.node.runAction(seq);
            this.unschedule(this.updateLastTime);
        }
    },

    requestDissolve: function () {
        RoomHandler.deleteRoom(GameData.room.id, 'apply');
        this.node.getComponent('roomMain').showSettingLayer(1, 0);
    },

    requestDissolveAgree: function () {
        RoomHandler.deleteRoom(GameData.room.id, 'agree');
    },

    requestDissolveDisagree: function () {
        RoomHandler.deleteRoom(GameData.room.id, 'disagree');
    },

    handleRoomDisbandTimer: function (data) {
        this.totalTime = data.startTime;
        this.lastTime = data.lastTime;
        this.schedule(this.updateLastTime, 1);
    },

    updateLastTime: function () {
        this.lastTime--;
        var labelStr = '倒计时结束后自动解散牌局   ' + formatSeconds(this.lastTime, 1);
        this.lastTimeLabel.string = labelStr;
        if (this.lastTime <= 0) {
            RoomHandler.deleteRoom(GameData.room.id, 'close');
            this.unschedule(this.updateLastTime);
        }
    },

    showJoinerLost: function (data) {
        cc.log('disconnect uid : ' + data.detail.uid);
        this.showHeaderDisconnect(data.detail.uid, true);
    },

    showJoinerConnect: function (data) {
        cc.log('connect uid : ' + data.detail.uid);
        this.showHeaderDisconnect(data.detail.uid, false);
    },

    showHeaderDisconnect: function (uid, show) {
        for (var i = 0; i < GameData.joiners.length; i++) {
            var headerNode = GameData.joiners[i];
            var index = i + 1;
            if (headerNode && headerNode.uid == uid) {
                var disNode = cc.find('header_' + index + '/lost', this.headerNode.parent);
                disNode.active = show;
                return;
            }
        }
    },
});