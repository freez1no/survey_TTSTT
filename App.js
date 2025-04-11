import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import MainScreen from './screens/MainScreen';
import FunctionScreen from './screens/FunctionScreen';
import LogScreen from './screens/LogScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Main">
        <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Function" component={FunctionScreen} options={{ title: '기능화면' }} />
        <Stack.Screen name="Log" component={LogScreen} options={{ title: '로그화면' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
