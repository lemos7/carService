import { useState } from 'react';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Notice, Overview } from '@/components/inicio/Overview';
import { VehicleList } from '@/components/veiculos/VehicleList';
import { styles } from '@/components/inicio/inicio.styles';
import { ImportWarnings } from '@/components/manutencoes/DataStatus';
import { FuelSection } from '@/components/consumo/FuelSection';

type Section = 'Início' | 'Veículos' | 'Alertas' | 'Consumo';
const sections: Section[] = ['Início', 'Veículos', 'Alertas', 'Consumo'];

export default function HomeScreen(): ReactElement {
  const { section: initialSection } = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<Section>(sections.find((item: Section): boolean => item === initialSection) ?? 'Início');
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brand}><Text style={styles.accent}>Garagem</Text> em Dia</Text>
        <View style={styles.account}>
          <Text style={styles.greeting}>Olá, visitante</Text>
          <Pressable accessibilityRole="button" onPress={(): void => router.replace('/login')}
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>
      </View>
      <SafeAreaView style={styles.body} edges={['bottom']}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{section === 'Início' ? 'Meu carro em números' : section === 'Veículos' ? 'Meus veículos' : section}</Text>
            <Text style={styles.subtitle}>{section === 'Início' ? 'Seus gastos e consumo, em um só lugar.'
              : section === 'Veículos' ? 'Todos os dados do seu carro em um só lugar.'
                : section === 'Alertas' ? 'Fique em dia com os próximos cuidados.' : 'Acompanhe os abastecimentos do seu carro.'}</Text>
          </View>
          <ImportWarnings />
          {section === 'Início' ? <Overview onFuel={(): void => setSection('Consumo')} /> : section === 'Alertas' ? <Notice /> : section === 'Veículos' ? <VehicleList /> : <FuelSection />}
          <Text style={styles.demo}>Demonstração · uma garagem local compartilhada.</Text>
        </ScrollView>
        <View style={styles.navigationContainer}>
          <View accessibilityRole="tablist" accessibilityLabel="Menu principal" style={styles.navigation}>
            {sections.map((item: Section): ReactElement => (
              <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: section === item }}
                onPress={(): void => setSection(item)}
                style={({ pressed }) => [styles.tab, section === item && styles.selectedTab, pressed && styles.tabPressed]}>
                <Text style={[styles.tabText, section === item && styles.selectedTabText]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
