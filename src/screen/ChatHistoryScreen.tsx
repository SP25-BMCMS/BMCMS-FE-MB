import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChatHistory } from '../service/Auth';

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryResponse {
  data: ChatMessage[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

const ChatHistoryScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadChatHistory();
    }
  }, [userId]);

  const loadChatHistory = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await getChatHistory(userId);
      if (response && response.data) {
        setChatHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderChatItem = ({ item }: { item: ChatMessage }) => {
    const messageDate = formatDate(item.createdAt);
    const messageTime = formatTime(item.createdAt);

    if (!item.isUser) {
      return (
        <View style={styles.botMessageContainer}>
          <View style={styles.botAvatarContainer}>
            <LinearGradient
              colors={['#4A90E2', '#5A5DE8', '#7367F0']}
              style={styles.botAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="smart-toy" size={16} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.messageContentContainer}>
            <View style={styles.botMessageBubble}>
              <Text style={styles.botMessageText}>{item.message}</Text>
            </View>
            <Text style={styles.timeText}>{messageTime}</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.userMessageContainer}>
          <View style={styles.messageContentContainer}>
            <View style={styles.userMessageBubble}>
              <Text style={styles.userMessageText}>{item.message}</Text>
            </View>
            <Text style={[styles.timeText, styles.userTimeText]}>{messageTime}</Text>
          </View>
        </View>
      );
    }
  };

  // Group messages by date
  const groupedMessages = chatHistory.reduce<{ [date: string]: ChatMessage[] }>((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Convert grouped messages to array for FlatList
  const groupedData = Object.entries(groupedMessages).map(([date, messages]) => ({
    date,
    messages,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử trò chuyện</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
        </View>
      ) : chatHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="history" size={80} color="#CCCCCC" />
          <Text style={styles.emptyText}>Chưa có lịch sử trò chuyện</Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View style={styles.dateSection}>
              <View style={styles.dateSeparator}>
                <Text style={styles.dateText}>{item.date}</Text>
              </View>
              <FlatList
                data={item.messages}
                keyExtractor={(msg) => msg.id}
                renderItem={renderChatItem}
                scrollEnabled={false}
              />
            </View>
          )}
          contentContainerStyle={styles.chatList}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  chatList: {
    padding: 10,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateSeparator: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 10,
  },
  dateText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  botMessageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingRight: '15%',
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15,
    paddingLeft: '15%',
  },
  botAvatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContentContainer: {
    flex: 1,
  },
  botMessageBubble: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userMessageBubble: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 18,
    borderTopRightRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  botMessageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  userMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
  },
  userTimeText: {
    textAlign: 'right',
    marginRight: 4,
  },
});

export default ChatHistoryScreen; 