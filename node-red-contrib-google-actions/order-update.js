const request = require('request-promise');
const {OrderUpdate} = require('actions-on-google');
const helper = require('node-red-viseo-helper');

module.exports = function(RED) {

    const register = function(config) {
    
        RED.nodes.createNode(this, config);
        let node = this;
        
        node.status({fill:"red", shape:"ring", text: 'Missing credential'})

        if (config.auth) {
            node.auth = RED.nodes.getNode(config.auth);
            node.status({});
        }

        this.on('input', (data)  => { input(RED, node, data, config) });
    }

    RED.nodes.registerType("google-order-update", register, {});
}

 const input = function (RED, node, data, config) {

	const 	order = helper.getByString(data, config.order),
			orderStatus = config.orderStatus,
			statusLabel = config.statusLabel,
			orderItemNames = helper.getContextValue(RED, node, data, config.orderItemNames, config.orderItemNamesType),
			reason = config.reason,
			hasNotification = config.hasNotification,
			notificationTitle = config.notificationTitle,
			notificationText = config.notificationText,
			isInSandbox = true;

			order.lastUpdateTime = new Date().toISOString();

	for(let lineItem of order.contents.lineItems) {
        if(orderItemNames.indexOf(lineItem.name) !== -1) {
            lineItem.reservation.status = orderStatus;
            lineItem.reservation.userVisibleStatusLabel = statusLabel
        }
    }

	const orderUpdateObject ={
		updateMask: {
			paths: ['lastUpdateTime',
          'contents.lineItems.reservation.status',
          'contents.lineItems.reservation.userVisibleStatusLabel']
		},
		order,
		reason: reason
		// type: 'ORDER_STATUS'
	};

	if(hasNotification) {
		orderUpdateObject.userNotification = {
			title: notificationTitle,
			text: notificationText
		}
	}

	try {
        node.auth.authenticate(async (auth) => {

			const options = {
				method: 'PATCH',
				url: `https://actions.googleapis.com/v3/orders/${order.merchantOrderId}`,
				headers: {
					'Authorization': 'Bearer ' + auth.credentials.access_token,
				},
				body: {
					header: {
						'isInSandbox': isInSandbox
					},
					orderUpdate : new OrderUpdate(orderUpdateObject),
				},
				json: true,
			};

			try {

				const result = await request(options);
				data.payload = result;
				node.send(data);
			} catch(e) {
				console.log(e);
				data.payload = e;
				node.send(undefined, data);
			}

		});

	} catch(err) {

		console.log(err);
		data.payload = err;
		node.send(undefined, data);

	}

}