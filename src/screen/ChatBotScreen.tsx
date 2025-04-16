import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { sendChatMessage, getChatHistory } from '../service/Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
}

const ChatBotScreen = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation();
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<{[date: string]: ChatMessage[]}>({});

  // Load chat history when component mounts
  useEffect(() => {
    const checkAccess = async () => {
      const userType = await AsyncStorage.getItem('userType');
      if (userType !== 'resident') {
        Alert.alert(
          "Quyền truy cập bị từ chối",
          "Tính năng này chỉ dành cho cư dân.",
          [{ text: "Quay lại", onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // Nếu là resident, tiếp tục tải dữ liệu
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
      loadInitialMessages();
    };

    checkAccess();
  }, [navigation]);

  // Xử lý và nhóm tin nhắn theo ngày
  const processHistoryByDate = (messages: ChatMessage[]) => {
    const groupedByDate: {[date: string]: ChatMessage[]} = {};
    const dates: string[] = [];
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateStr = date.toLocaleDateString('vi-VN', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = [];
        dates.push(dateStr);
      }
      
      groupedByDate[dateStr].push(msg);
    });
    
    // Sắp xếp ngày từ mới đến cũ
    dates.sort((a, b) => {
      const dateA = new Date(a.split(' ').slice(1).join(' ').replace('tháng', ''));
      const dateB = new Date(b.split(' ').slice(1).join(' ').replace('tháng', ''));
      return dateB.getTime() - dateA.getTime();
    });
    
    setHistoryDates(dates);
    setGroupedHistory(groupedByDate);
  };

  // Tải lịch sử chat
  const loadInitialMessages = async () => {
    try {
      setInitialLoading(true);
      
      if (!userId) {
        // Nếu chưa có userId, chỉ hiển thị tin nhắn chào mừng
        const welcomeMessage: ChatMessage = {
          id: `bot-welcome-${Date.now()}`,
          text: 'Xin chào! Tôi là trợ lý ảo của hệ thống Building Management & Crack Monitoring System. Tôi có thể giúp gì cho bạn hôm nay?',
          isBot: true,
          timestamp: Date.now(),
        };
        
        setChatHistory([welcomeMessage]);
        return;
      }
      
      // Tải lịch sử chat từ API
      try {
        const historyResponse = await getChatHistory(userId);
        if (historyResponse && historyResponse.data && Array.isArray(historyResponse.data)) {
          const formattedHistory: ChatMessage[] = historyResponse.data.map((item: any, index: number) => ({
            id: `history-${index}-${Date.now()}`,
            text: item.message || item.text,
            isBot: item.sender === 'bot' || item.isBot === true,
            timestamp: new Date(item.timestamp || item.createdAt || Date.now()).getTime(),
          }));
          
          if (formattedHistory.length > 0) {
            setChatHistory(formattedHistory);
            processHistoryByDate(formattedHistory);
          } else {
            // Nếu không có lịch sử, hiển thị tin nhắn chào mừng
            const welcomeMessage: ChatMessage = {
              id: `bot-welcome-${Date.now()}`,
              text: 'Xin chào! Tôi là trợ lý ảo của hệ thống Building Management & Crack Monitoring System. Tôi có thể giúp gì cho bạn hôm nay?',
              isBot: true,
              timestamp: Date.now(),
            };
            setChatHistory([welcomeMessage]);
          }
        } else {
          throw new Error('Không tìm thấy lịch sử chat');
        }
      } catch (err) {
        console.error('Lỗi khi tải lịch sử chat:', err);
        // Hiển thị tin nhắn chào mừng khi có lỗi
        const welcomeMessage: ChatMessage = {
          id: `bot-welcome-${Date.now()}`,
          text: 'Xin chào! Tôi là trợ lý ảo của hệ thống Building Management & Crack Monitoring System. Tôi có thể giúp gì cho bạn hôm nay?',
          isBot: true,
          timestamp: Date.now(),
        };
        setChatHistory([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Hiển thị tin nhắn chào mừng khi có lỗi
      const welcomeMessage: ChatMessage = {
        id: `bot-welcome-${Date.now()}`,
        text: 'Xin chào! Tôi là trợ lý ảo của hệ thống Building Management & Crack Monitoring System. Tôi có thể giúp gì cho bạn hôm nay?',
        isBot: true,
        timestamp: Date.now(),
      };
      setChatHistory([welcomeMessage]);
    } finally {
      setInitialLoading(false);
    }
  };

  // Cập nhật processHistoryByDate khi chatHistory thay đổi
  useEffect(() => {
    if (chatHistory.length > 0) {
      processHistoryByDate(chatHistory);
    }
  }, [chatHistory]);

  const handleSend = async () => {
    if (!message.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: message.trim(),
      isBot: false,
      timestamp: Date.now(),
    };

    setChatHistory(prevChat => [...prevChat, userMessage]);
    setMessage('');

    // Show typing indicator
    setLoading(true);

    try {
      // Send message to API
      const response = await sendChatMessage(userMessage.text);
      
      // Add bot response to chat
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: response.message || 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.',
        isBot: true,
        timestamp: Date.now(),
      };

      setChatHistory(prevChat => [...prevChat, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message if API call fails
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: 'Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại sau.',
        isBot: true,
        timestamp: Date.now(),
      };
      
      setChatHistory(prevChat => [...prevChat, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when new messages come in
  useEffect(() => {
    if (chatHistory.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [chatHistory]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.isBot) {
      return (
        <View style={styles.botMessageContainer}>
          <View style={styles.botAvatarContainer}>
            <LinearGradient
              colors={['#4A90E2', '#5A5DE8', '#7367F0']}
              style={styles.botAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="smart-toy" size={20} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.botMessageBubble}>
            <Text style={styles.botMessageText}>{item.text}</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.userMessageContainer}>
          <View style={styles.userMessageBubble}>
            <Text style={styles.userMessageText}>{item.text}</Text>
          </View>
        </View>
      );
    }
  };

  // Hiển thị tin nhắn trong lịch sử
  const renderHistoryMessage = (item: ChatMessage) => {
    const messageTime = new Date(item.timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (item.isBot) {
      return (
        <View style={styles.historyBotMessageContainer}>
          <View style={styles.historyBotAvatarContainer}>
            <LinearGradient
              colors={['#4A90E2', '#5A5DE8', '#7367F0']}
              style={styles.historyBotAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="smart-toy" size={14} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.historyBotMessageContent}>
            <View style={styles.historyBotMessageBubble}>
              <Text style={styles.historyBotMessageText}>{item.text}</Text>
            </View>
            <Text style={styles.historyTimeText}>{messageTime}</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.historyUserMessageContainer}>
          <View style={styles.historyUserMessageContent}>
            <View style={styles.historyUserMessageBubble}>
              <Text style={styles.historyUserMessageText}>{item.text}</Text>
            </View>
            <Text style={styles.historyTimeText}>{messageTime}</Text>
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Virtual Assistant</Text>
          <Text style={styles.headerSubtitle}>Building Management Support</Text>
        </View>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => setHistoryModalVisible(true)}
        >
          <Icon name="history" size={24} color="#4A90E2" />
        </TouchableOpacity>
        <View style={styles.botHeaderAvatarContainer}>
          <LinearGradient
            colors={['#4A90E2', '#5A5DE8', '#7367F0']}
            style={styles.botHeaderAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="smart-toy" size={24} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </View>

      {/* Chat area */}
      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={chatHistory}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatContainer}
        />
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.typingIndicator}>
          <View style={styles.botAvatarContainer}>
            <LinearGradient
              colors={['#4A90E2', '#5A5DE8', '#7367F0']}
              style={styles.botAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="smart-toy" size={20} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>Đang nhập...</Text>
          </View>
        </View>
      )}

      {/* Input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || loading}
        >
          <Icon name="send" size={24} color={message.trim() ? "#4A90E2" : "#CCC"} />
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Modal Lịch sử chat */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lịch sử trò chuyện</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setHistoryModalVisible(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyScrollView}>
              {historyDates.length > 0 ? (
                historyDates.map((date) => (
                  <View key={date} style={styles.historyDateSection}>
                    <View style={styles.historyDateHeader}>
                      <Text style={styles.historyDateText}>{date}</Text>
                    </View>
                    {groupedHistory[date].map((item) => (
                      <View key={item.id}>
                        {renderHistoryMessage(item)}
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <View style={styles.emptyHistoryContainer}>
                  <Icon name="history" size={64} color="#CCC" />
                  <Text style={styles.emptyHistoryText}>
                    Chưa có lịch sử trò chuyện
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'ios' ? 10 : 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  historyButton: {
    marginRight: 10,
    padding: 5,
  },
  botHeaderAvatarContainer: {
    marginLeft: 'auto',
  },
  botHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  botMessageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    maxWidth: '90%',
  },
  botAvatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  botAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botMessageBubble: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    maxWidth: '90%',
  },
  botMessageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15,
  },
  userMessageBubble: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 18,
    borderTopRightRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    maxWidth: '80%',
  },
  userMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 18,
    borderTopLeftRadius: 5,
  },
  typingText: {
    color: '#999',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    padding: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.5,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    width: '90%',
    height: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  historyScrollView: {
    flex: 1,
  },
  historyDateSection: {
    marginBottom: 20,
  },
  historyDateHeader: {
    backgroundColor: '#F0F0F0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  historyDateText: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#666',
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyHistoryText: {
    marginTop: 15,
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  historyBotMessageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  historyUserMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  historyBotAvatarContainer: {
    marginRight: 6,
    alignSelf: 'flex-start',
  },
  historyBotAvatar: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBotMessageContent: {
    maxWidth: '75%',
  },
  historyUserMessageContent: {
    maxWidth: '75%',
    alignItems: 'flex-end',
  },
  historyBotMessageBubble: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 16,
    borderTopLeftRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  historyUserMessageBubble: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 16,
    borderTopRightRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  historyBotMessageText: {
    fontSize: 14,
    color: '#333',
  },
  historyUserMessageText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  historyTimeText: {
    fontSize: 10,
    color: '#999',
    marginTop: 3,
  },
});

export default ChatBotScreen; 