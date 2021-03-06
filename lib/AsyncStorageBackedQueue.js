import {InteractionManager, Text} from 'react-native';
import {AsyncStorage} from 'react-native';


AsyncStorageBackedQueue = function(config) {
    if('xmpp_client' in config) {
      this.xmpp_client = config.xmpp_client;
    }
    if('retry_interval_sec' in config) {
      this.retry_interval_sec = config.retry_interval_sec;
    }
    if('queue_name' in config) {
      this.queue_name = config.queue_name;
      AsyncStorage.getItem(this.queue_name).then((data) => {
        if(data) {
          this.queue = JSON.parse(data);
        }
      });
    } else {
      throw {
        "messgae": "Queue name missing"
      }
    }
}

AsyncStorageBackedQueue.prototype.queue = []
AsyncStorageBackedQueue.prototype.queue_name = undefined
AsyncStorageBackedQueue.prototype.is_dirty = false
AsyncStorageBackedQueue.prototype.retry_interval_sec = 15;
AsyncStorageBackedQueue.prototype.xmpp_client = undefined;
AsyncStorageBackedQueue.prototype.interval = undefined;


AsyncStorageBackedQueue.prototype.dequeue_element = function(id, id_field) {
  var index = this.queue.map(function(el) {
      return el[id_field];
    }).indexOf(id);
    if(index != -1) {
      var dequeued_element = this.queue.splice(index, 1);
      this._persist_queue();
      return dequeued_element;
    }
    return undefined;
}

AsyncStorageBackedQueue.prototype.queue_element = function(element) {
  this.queue.push(element);
  this.is_dirty = true;
  this._persist_queue();
}


AsyncStorageBackedQueue.prototype.dequeue = function () {
  var element = this.queue.pop();
  this._persist_queue();
  return element;
}

AsyncStorageBackedQueue.prototype.filter = function(filter_fn) {
  var res = this.queue.filter(filter_fn);
  if(res && res.length > 0) {
    return res[0];
  }
}

AsyncStorageBackedQueue.prototype._persist_queue = function() {
  var that = this;
  AsyncStorage.setItem(that.queue_name, JSON.stringify(that.queue),
    () => {
      is_dirty = false;
    },
    (error) => {
      console.log("Error while inserting data");
    });
}

AsyncStorageBackedQueue.prototype._retry_send = function() {
  var that = this;
    this.interval = setInterval(function() {
      InteractionManager.runAfterInteractions(() => {
        that.queue.map(function(el) {
          if((new Date().getTime() - el.send_timestamp) >= that.retry_interval_sec*1000) {
            if(that.xmpp_client) {
              try {
                that.xmpp_client.push(el.to, el.str, el.type, [el.message], true);
              }
              catch(e) {

              }
            }
          }
        });
      });
    }, that.retry_interval_sec*1000);
}

AsyncStorageBackedQueue.prototype.stop_retry_send = function() {
  if (this.interval !== undefined) {
    clearInterval(this.interval)
  }
} 

AsyncStorageBackedQueue.prototype.start_retry = function() {
  this._retry_send();
}

exports.AsyncStorageBackedQueue = AsyncStorageBackedQueue;